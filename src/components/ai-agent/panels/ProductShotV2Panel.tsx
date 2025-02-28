
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";

interface ProductShotV2PanelProps {
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
    messages: Message[];
  };
  messages: Message[];
}

export const ProductShotV2Panel = ({ productShotV2, messages }: ProductShotV2PanelProps) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6 min-h-[calc(100vh-16rem)]">
          <ProductShotForm
            {...productShotV2}
            messages={messages}
          />
        </div>
        <div className="space-y-6">
          {productShotV2.generatedImages.length > 0 && (
            <GeneratedImagesPanel
              images={productShotV2.generatedImages}
              isGenerating={productShotV2.isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
};
