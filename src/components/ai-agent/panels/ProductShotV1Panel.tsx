
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { GenerateButton } from "./GenerateButton";
import { Camera } from "lucide-react";
import { Message } from "@/types/message";
import { ProductShotV1Props } from "../types";

interface ProductShotV1PanelProps {
  productShotV1: ProductShotV1Props;
  messages: Message[];
}

export const ProductShotV1Panel = ({ productShotV1, messages }: ProductShotV1PanelProps) => {
  const renderGenerateButton = () => {
    if (!productShotV1.prompt || !productShotV1.previewUrl || productShotV1.isGenerating) return null;
    
    return (
      <GenerateButton 
        onClick={productShotV1.onGenerate}
        disabled={productShotV1.isGenerating}
        icon={<Camera className="mr-2 h-4 w-4" />}
        label="Generate Image"
        creditCost={productShotV1.creditsRemaining > 0 ? "0.2 credits" : "Insufficient credits"}
        position="fixed"
      />
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 relative">
      <InputPanel
        {...productShotV1}
        messages={messages}
      />
      <GalleryPanel
        isMobile={productShotV1.isMobile}
        images={productShotV1.productImages}
        isLoading={productShotV1.imagesLoading}
        onDownload={productShotV1.onDownload}
      />
      {renderGenerateButton()}
    </div>
  );
};
