
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

interface ImageToVideoFeaturePanelProps {
  isMobile: boolean;
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  creditsRemaining: number;
  isGenerating: boolean;
  onGenerate: () => void;
}

interface ImageToVideoProps {
  isMobile: boolean;
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  creditsRemaining: number;
  isGenerating: boolean;
  onGenerate: (prompt: string, aspectRatio: string) => void;
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
  imageToVideo: ImageToVideoProps;
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
  imageToVideo,
  onInputChange,
  onSubmit,
}: SplitScreenProps) => {
  const [activeTool, setActiveTool] = useState('product-shot-v1');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Create an adapter for the imageToVideo props to match FeaturePanel expectations
  const imageToVideoAdapter: ImageToVideoFeaturePanelProps = {
    ...imageToVideo,
    onGenerate: () => imageToVideo.onGenerate(videoPrompt, aspectRatio)
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
            imageToVideo={imageToVideoAdapter}
            activeTool={activeTool}
          />
        </div>
      </div>
    </div>
  );
};
