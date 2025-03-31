
import { useState, useEffect } from "react";
import { ProductShotGenerator } from "@/components/product-shoot/ProductShotGenerator";
import { ProductShotResults } from "@/components/product-shoot/ProductShotResults";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductShotResult } from "@/types/product-shoot";

export default function ProductShot() {
  const { isGenerating, generatedImages, handleRetryImageCheck } = useProductShoot();
  const [productShotResults, setProductShotResults] = useState<ProductShotResult[]>([]);

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

  // Transform generatedImages to ProductShotResult format
  useEffect(() => {
    if (generatedImages && generatedImages.length > 0) {
      const results: ProductShotResult[] = generatedImages.map(img => ({
        resultUrl: img.url || '',
        inputUrl: img.prompt || '',
        placementType: 'automatic',
        description: img.prompt,
        metadata: {
          processingTime: Date.now(),
          model: 'product-shot-v2',
          size: '1024x1024'
        }
      }));
      setProductShotResults(results);
    }
  }, [generatedImages]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Product Shot Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ProductShotGenerator />
        </div>
        
        <div>
          <ProductShotResults 
            results={productShotResults}
            isGenerating={isGenerating}
            onRetry={handleRetryImageCheck}
          />
        </div>
      </div>
    </div>
  );
}
