
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
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
    messages: Message[];
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleToolSelect = (tool: string) => {
    setIsTransitioning(true);
    if (tool === 'ai-agent') {
      setShowChat(true);
    } else {
      setShowChat(false);
      setActiveTool(tool);
    }
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#1A1F2C]">
      <div 
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          isMobile ? "pb-20" : "flex h-[calc(100vh-4rem)]" // Increased bottom padding for mobile nav
        )}
      >
        {/* Chat Section */}
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out",
            isMobile ? (
              showChat 
                ? "fixed inset-0 z-30 animate-in fade-in slide-in pb-16" // Added padding bottom
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

        {/* Feature Panel Section */}
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out",
            isMobile ? (
              showChat 
                ? "hidden" 
                : cn(
                    "min-h-[calc(100vh-5rem)]", // Adjusted height to account for nav
                    isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  )
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

      {/* Mobile Navigation - Fixed positioning */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <MobileToolNav
            activeTool={showChat ? 'ai-agent' : activeTool}
            onToolSelect={handleToolSelect}
          />
        </div>
      )}
    </div>
  );
};
