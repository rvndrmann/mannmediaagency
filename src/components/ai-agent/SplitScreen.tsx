
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { ToolSelector } from "./ToolSelector";

interface SplitScreenProps {
  isMobile: boolean;
  messages: any[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  productShotV2: {
    onSubmit: (data: any) => void;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: any[];
  };
  productShotV1: {
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
    onPromptChange: (value: string) => void;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    onImageSizeChange: (value: string) => void;
    onInferenceStepsChange: (value: number) => void;
    onGuidanceScaleChange: (value: number) => void;
    onOutputFormatChange: (value: string) => void;
    onGenerate: () => void;
    onDownload: (url: string) => void;
  };
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
  const [splitRatio, setSplitRatio] = useState(50);

  return (
    <div className={cn(
      "flex h-[calc(100vh-4rem)]",
      isMobile && "flex-col fixed inset-0 top-16"
    )}>
      {/* Left Pane (Chat) */}
      <div 
        className={cn(
          "relative bg-[#1A1F2C] border-white/10",
          isMobile ? "h-[50vh] w-full border-b" : "flex-none w-[50%] border-r"
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

      {/* Right Pane (Tools) */}
      <div 
        className={cn(
          "relative bg-[#1A1F2C]",
          isMobile ? "h-[50vh] w-full overflow-auto" : "flex-1"
        )}
      >
        <ToolSelector 
          activeTool="product-shot-v1"
          onToolSelect={() => {}}
        />
        <div className={cn(
          "h-[calc(100%-3rem)] overflow-auto",
          isMobile && "pb-16" // Add bottom padding on mobile to account for keyboard
        )}>
          <FeaturePanel
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={productShotV1}
          />
        </div>
      </div>
    </div>
  );
};
