import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { MobileToolNav } from "./MobileToolNav";
import { ToolSelector } from "./ToolSelector";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";

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
  const [showChat, setShowChat] = useState(false);

  const handleToolSelect = (tool: string) => {
    if (tool === 'ai-agent') {
      setShowChat(true);
    } else {
      setShowChat(false);
      setActiveTool(tool);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      <div 
        className={cn(
          "transition-all duration-300",
          isMobile ? "pb-16" : "flex h-[calc(100vh-4rem)]"
        )}
      >
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300",
            isMobile ? (
              showChat 
                ? "fixed inset-0 z-30" 
                : "hidden"
            ) : (
              "relative w-[50%] border-r border-white/10"
            )
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
            "bg-[#1A1F2C]",
            isMobile ? (
              showChat 
                ? "hidden" 
                : "min-h-screen"
            ) : "flex-1"
          )}
        >
          {!isMobile && (
            <ToolSelector 
              activeTool={activeTool}
              onToolSelect={setActiveTool}
            />
          )}
          
          <FeaturePanel
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={productShotV1}
            imageToVideo={imageToVideo}
            activeTool={activeTool}
          />
        </div>
      </div>

      {isMobile && (
        <MobileToolNav
          activeTool={showChat ? 'ai-agent' : activeTool}
          onToolSelect={handleToolSelect}
        />
      )}
    </div>
  );
};
