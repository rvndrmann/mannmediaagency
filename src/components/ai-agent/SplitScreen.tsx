
import { ReactNode } from "react";
import { SidePanel } from "../chat/SidePanel";
import { FeaturePanel } from "./FeaturePanel";
import { ToolSelector } from "./ToolSelector";
import { Message } from "@/types/message";
import { GeneratedImage } from "@/types/product-shoot";
import { ImageSize } from "@/hooks/use-product-shot-v1";

interface SplitScreenProps {
  isMobile: boolean;
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: { credits_remaining: number } | null;
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onVideoTemplatesClick?: () => void;
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
    messages: Message[];
  };
  productShotV1: {
    isMobile: boolean;
    prompt: string;
    previewUrl: string | null;
    imageSize: ImageSize;
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
    onImageSizeChange: (value: ImageSize) => void;
    onInferenceStepsChange: (value: number) => void;
    onGuidanceScaleChange: (value: number) => void;
    onOutputFormatChange: (value: string) => void;
    onGenerate: () => void;
    onDownload: (url: string) => void;
    messages: Message[];
    onVideoTemplatesClick?: () => void;
  };
  imageToVideo: {
    isMobile: boolean;
    previewUrl: string | null;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    creditsRemaining: number;
    isGenerating: boolean;
    onGenerate: (prompt: string, aspectRatio: string) => void;
    onSelectFromHistory?: (jobId: string, imageUrl: string) => void;
  };
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCustomOrderClick?: () => void;
}

export function SplitScreen({
  isMobile,
  messages,
  input,
  isLoading,
  userCredits,
  activeTool,
  onToolSelect,
  onVideoTemplatesClick,
  productShotV2,
  productShotV1,
  imageToVideo,
  onInputChange,
  onSubmit,
  onBack,
  onCustomOrderClick
}: SplitScreenProps) {
  return (
    <div className="h-full flex flex-col bg-[#1A1F2C]">
      <ToolSelector 
        activeTool={activeTool} 
        onToolSelect={onToolSelect} 
        onCustomOrderClick={onCustomOrderClick}
        onVideoTemplatesClick={onVideoTemplatesClick}
        showVideoTemplatesButton={!!productShotV1.previewUrl && activeTool === 'product-shot-v1'}
      />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {!isMobile && <div className="w-1/2">
          <FeaturePanel 
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={{
              ...productShotV1,
              onVideoTemplatesClick: productShotV1.onVideoTemplatesClick || onVideoTemplatesClick
            }}
            imageToVideo={imageToVideo}
            activeTool={activeTool}
          />
        </div>}
        
        {isMobile && activeTool !== 'ai-agent' && <div className="flex-1">
          <FeaturePanel 
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={{
              ...productShotV1,
              onVideoTemplatesClick: productShotV1.onVideoTemplatesClick || onVideoTemplatesClick
            }}
            imageToVideo={imageToVideo}
            activeTool={activeTool}
          />
        </div>}
        
        {(!isMobile || activeTool === 'ai-agent') && <div className={isMobile ? "flex-1" : "w-1/2"}>
          <SidePanel
            messages={messages}
            input={input}
            isLoading={isLoading}
            userCredits={userCredits}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onBack={onBack}
          />
        </div>}
      </main>
    </div>
  );
}
