
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductShotForm, ProductShotFormData } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { HistoryPanel } from "@/components/product-shoot-v2/HistoryPanel";

interface GeneratedImage {
  url: string;
  content_type: string;
}

interface GenerationResult {
  images: GeneratedImage[];
  request_id?: string;
  status?: string;
}

const ProductShootV2 = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const queryClient = useQueryClient();

  const handleGenerate = async (formData: ProductShotFormData) => {
    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }

      // Upload source file
      const sourceFileExt = formData.sourceFile!.name.split('.').pop();
      const sourceFileName = `${crypto.randomUUID()}.${sourceFileExt}`;

      console.log('Uploading source file:', sourceFileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('source_images')
        .upload(sourceFileName, formData.sourceFile!, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('source_images')
        .getPublicUrl(sourceFileName);

      console.log('Source image uploaded successfully:', publicUrl);

      let referenceUrl = '';
      if (formData.generationType === 'reference' && formData.referenceFile) {
        const refFileExt = formData.referenceFile.name.split('.').pop();
        const refFileName = `ref_${crypto.randomUUID()}.${refFileExt}`;
        
        console.log('Uploading reference file:', refFileName);

        const { error: refUploadError } = await supabase.storage
          .from('source_images')
          .upload(refFileName, formData.referenceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (refUploadError) {
          console.error('Reference upload error:', refUploadError);
          throw new Error(`Failed to upload reference image: ${refUploadError.message}`);
        }

        const { data: { publicUrl: refPublicUrl } } = supabase.storage
          .from('source_images')
          .getPublicUrl(refFileName);

        console.log('Reference image uploaded successfully:', refPublicUrl);
        referenceUrl = refPublicUrl;
      }

      const requestBody: any = {
        image_url: publicUrl,
        shot_size: [formData.shotWidth, formData.shotHeight],
        num_results: formData.numResults,
        fast: formData.fastMode,
        placement_type: formData.placementType,
        sync_mode: formData.syncMode
      };

      if (formData.generationType === 'description') {
        requestBody.scene_description = formData.sceneDescription;
        requestBody.optimize_description = formData.optimizeDescription;
      } else {
        requestBody.ref_image_url = referenceUrl;
      }

      if (formData.placementType === 'manual_placement') {
        requestBody.manual_placement_selection = formData.manualPlacement;
      } else if (formData.placementType === 'manual_padding') {
        requestBody.padding_values = [
          formData.padding.left,
          formData.padding.right,
          formData.padding.top,
          formData.padding.bottom
        ];
      } else if (formData.placementType === 'original') {
        requestBody.original_quality = formData.originalQuality;
      }

      console.log('Sending request to edge function:', requestBody);

      const { data, error } = await supabase.functions.invoke<GenerationResult>(
        'generate-product-shot',
        {
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Edge function response:', data, error);

      if (error) {
        throw new Error(error.message || 'Failed to generate image');
      }

      if (formData.syncMode) {
        if (!data?.images?.length) {
          throw new Error('No images received from the generation API');
        }
        setGeneratedImages(data.images);

        // Add the history entry with user_id included
        const historyEntry = {
          user_id: session.user.id,  // Include user_id from the session
          source_image_url: publicUrl,
          result_url: data.images[0].url,
          scene_description: requestBody.scene_description || null,
          ref_image_url: referenceUrl || null,
          settings: requestBody
        };

        await supabase.from('product_shot_history').insert(historyEntry);

        queryClient.invalidateQueries({ queryKey: ["product-shot-history"] });
        
        toast.success("Image generated successfully!");
      } else {
        toast.success("Image generation started! Please wait...");
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMessage = error.message || "Failed to generate image. Please try again.";
      
      if (errorMessage.toLowerCase().includes('fal_key')) {
        toast.error("There was an issue with the AI service configuration. Please try again later or contact support.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Product Shoot V2</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProductShotForm 
                  onSubmit={handleGenerate}
                  isGenerating={isGenerating}
                />

                <div className="space-y-4">
                  <GeneratedImagesPanel 
                    images={generatedImages}
                    isGenerating={isGenerating}
                  />

                  <div className="bg-gray-900 rounded-lg border border-gray-800">
                    <div className="p-4 border-b border-gray-800">
                      <h2 className="text-lg font-semibold">Generation History</h2>
                    </div>
                    <HistoryPanel />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProductShootV2;
