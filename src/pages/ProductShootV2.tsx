
import { ProductShootLayout } from "@/components/product-shoot-v2/ProductShootLayout";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { HistoryPanel } from "@/components/product-shoot-v2/HistoryPanel";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ProductShootV2() {
  const { 
    isGenerating, 
    generatedImages, 
    generateProductShot,  // This will serve as handleGenerate
    handleCheckImage,     // This will serve as handleRetryImageCheck
  } = useProductShoot();

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Create an isSubmitting state that mirrors isGenerating for consistency with form requirements
  const isSubmitting = isGenerating;

  // Create handleGenerate wrapper to match expected form interface
  const handleGenerate = async (formData: any) => {
    await generateProductShot(formData.prompt, formData.sourceImageUrl, formData);
  };

  return (
    <ProductShootLayout>
      <h1 className="text-2xl font-bold mb-6 text-white">Product Shot V2</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[400px] shrink-0">
          <ProductShotForm 
            onSubmit={handleGenerate}
            isGenerating={isGenerating}
            isSubmitting={isSubmitting}
            availableCredits={userCredits?.credits_remaining}
            messages={[]} // Add empty array as default messages
          />
        </div>

        <div className="flex-1 space-y-6">
          <GeneratedImagesPanel 
            images={generatedImages}
            isGenerating={isGenerating}
            onRetry={handleCheckImage}
          />

          <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Generation History</h2>
            </div>
            <HistoryPanel />
          </div>
        </div>
      </div>
    </ProductShootLayout>
  );
}
