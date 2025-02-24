
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
  const [activeTool, setActiveTool] = useState("product-shot-v1");

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const touch = e.touches[0];
      const container = e.currentTarget.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setSplitRatio(Math.min(Math.max(percentage, 30), 70));
      }
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-row h-[calc(100vh-4rem)]",
        isMobile && "fixed inset-0 top-16"
      )}
    >
      {/* Left Pane (Chat) */}
      <div 
        className="relative flex-none overflow-hidden border-r border-white/10"
        style={{ width: `${splitRatio}%` }}
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

      {/* Draggable Divider */}
      <div 
        className="w-1 bg-white/10 cursor-col-resize touch-none hover:bg-purple-500/50 active:bg-purple-500"
        onTouchMove={handleDrag}
        onMouseDown={() => {
          const handleMouseMove = (e: MouseEvent) => {
            const container = document.querySelector('.split-screen-container');
            if (container) {
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              setSplitRatio(Math.min(Math.max(percentage, 30), 70));
            }
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />

      {/* Right Pane (Tools) */}
      <div 
        className="relative flex-none overflow-hidden"
        style={{ width: `${100 - splitRatio}%` }}
      >
        <ToolSelector 
          activeTool={activeTool}
          onToolSelect={setActiveTool}
        />
        <div className="h-[calc(100%-3rem)] overflow-auto">
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
