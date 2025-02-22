
import { ProductShootLayout } from "@/components/product-shoot-v2/ProductShootLayout";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { HistoryPanel } from "@/components/product-shoot-v2/HistoryPanel";
import { useProductShoot } from "@/hooks/use-product-shoot";

export default function ProductShootV2() {
  const { isGenerating, generatedImages, handleGenerate } = useProductShoot();

  return (
    <ProductShootLayout>
      <h1 className="text-2xl font-bold mb-6 text-white">Product Shoot V2</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[400px] shrink-0">
          <ProductShotForm 
            onSubmit={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>

        <div className="flex-1 space-y-6">
          <GeneratedImagesPanel 
            images={generatedImages}
            isGenerating={isGenerating}
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
