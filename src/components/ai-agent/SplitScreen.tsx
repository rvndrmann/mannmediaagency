
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { ToolSelector } from "./ToolSelector";
import { GeneratedImage } from "@/types/product-shoot";

interface ProductShotV1Props {
  isMobile: boolean;
  prompt: string;
  previewUrl: string | null;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
  productImages: any[];
  imagesLoading: boolean;
  creditsRemaining: number;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (value: string) => void;
  onInferenceStepsChange: (value: number) => void;
  onGuidanceScaleChange: (value: number) => void;
  onOutputFormatChange: (value: string) => void;
  onGenerate: () => void;
  onDownload: (url: string) => void;
}

interface SplitScreenProps {
  isMobile: boolean;
  messages: any[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
  };
  productShotV1: ProductShotV1Props;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SplitScreen = ({
  isMobile,
  messages,
  input,
  isLoading,
  userCredits,
  productShotV2,
  productShotV1,
  onInputChange,
  onSubmit,
}: SplitScreenProps) => {
  const [activeTool, setActiveTool] = useState('product-shot-v1');
  
  // Add state for Image to Video section
  const [imageToVideoPreview, setImageToVideoPreview] = useState<string | null>(null);
  const [imageToVideoFile, setImageToVideoFile] = useState<File | null>(null);

  const handleImageToVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageToVideoFile(file);
      const url = URL.createObjectURL(file);
      setImageToVideoPreview(url);
    }
  };

  const handleImageToVideoClear = () => {
    if (imageToVideoPreview) {
      URL.revokeObjectURL(imageToVideoPreview);
    }
    setImageToVideoPreview(null);
    setImageToVideoFile(null);
  };

  // Create props objects for passing down
  const productShotV1Props = {
    ...productShotV1,
    isMobile,
    prompt: productShotV1.prompt,
    previewUrl: productShotV1.previewUrl,
    imageSize: productShotV1.imageSize,
    inferenceSteps: productShotV1.inferenceSteps,
    guidanceScale: productShotV1.guidanceScale,
    outputFormat: productShotV1.outputFormat,
    productImages: productShotV1.productImages,
    imagesLoading: productShotV1.imagesLoading,
    creditsRemaining: productShotV1.creditsRemaining,
    isGenerating: productShotV1.isGenerating,
    onPromptChange: productShotV1.onPromptChange,
    onFileSelect: productShotV1.onFileSelect,
    onClearFile: productShotV1.onClearFile,
    onImageSizeChange: productShotV1.onImageSizeChange,
    onInferenceStepsChange: productShotV1.onInferenceStepsChange,
    onGuidanceScaleChange: productShotV1.onGuidanceScaleChange,
    onOutputFormatChange: productShotV1.onOutputFormatChange,
    onGenerate: productShotV1.onGenerate,
    onDownload: productShotV1.onDownload
  };

  const imageToVideoProps = {
    isMobile,
    previewUrl: imageToVideoPreview,
    onFileSelect: handleImageToVideoFileSelect,
    onClearFile: handleImageToVideoClear,
    creditsRemaining: productShotV1.creditsRemaining,
    isGenerating: false,
    onGenerate: () => {},
  };

  return (
    <div 
      className={cn(
        "flex h-screen",
        isMobile ? "flex-col" : "h-[calc(100vh-4rem)]"
      )}
    >
      <div 
        className={cn(
          "relative bg-[#1A1F2C] border-white/10",
          isMobile ? "h-screen w-full border-b pb-16" : "flex-none w-[50%] border-r"
        )}
      >
        <ChatSection
          messages={messages}
          input={input}
          isLoading={isLoading}
          userCredits={userCredits}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
        />
      </div>

      <div 
        className={cn(
          "relative bg-[#1A1F2C]",
          isMobile ? "min-h-screen w-full pb-16" : "flex-1"
        )}
      >
        <ToolSelector 
          activeTool={activeTool}
          onToolSelect={setActiveTool}
        />
        
        <div className={cn(
          "h-[calc(100%-3rem)]",
          isMobile && "mt-4"
        )}>
          <FeaturePanel
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={productShotV1}
            imageToVideo={imageToVideoProps}
            activeTool={activeTool}
          />
        </div>
      </div>
    </div>
  );
};
