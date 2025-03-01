
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { MobileToolNav } from "./MobileToolNav";
import { ToolSelector } from "./ToolSelector";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

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

interface ImageToVideoProps {
  isMobile: boolean;
  previewUrl: string | null;
  prompt: string;
  aspectRatio: string;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  creditsRemaining: number;
  isGenerating: boolean;
  onGenerate: (prompt: string, aspectRatio: string) => void;
  onSelectFromHistory: (jobId: string, imageUrl: string) => void;
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
    <div className="relative min-h-screen h-full bg-[#1A1F2C]">
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isMobile ? "" : "flex h-screen"
        )}
      >
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "fixed inset-0 z-50 animate-in fade-in slide-in" 
                : "hidden"
            ) : (
              "relative w-[50%] border-r border-white/10 overflow-hidden"
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
            isMobile={isMobile}
          />
        </div>

        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "hidden" 
                : cn(
                    "pb-32", // Space for bottom navigation
                    isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  )
            ) : "flex-1 overflow-hidden"
          )}
        >
          {!isMobile && (
            <ToolSelector 
              activeTool={activeTool}
              onToolSelect={setActiveTool}
            />
          )}
          
          {/* Tools Grid for Mobile */}
          {isMobile && (
            <div className="px-3 pt-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onToolSelect(tool.id)}
                    className={cn(
                      "flex flex-col items-center justify-center py-4 px-4 rounded-xl",
                      "transition-all duration-300 ease-in-out",
                      activeTool === tool.id 
                        ? "bg-green-500 transform scale-[0.98]"
                        : tool.bgColor + " hover:scale-[0.98]"
                    )}
                  >
                    <div className="text-white mb-1.5">
                      {tool.icon}
                    </div>
                    <span className="text-white font-medium text-[11px]">
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Agent Button for Mobile - Positioned between tools and feature panel */}
          {isMobile && (
            <div className="flex justify-center mb-4">
              <Button 
                onClick={() => handleToolSelect('ai-agent')}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "h-16 w-16 rounded-full z-40",
                  "transition-all duration-300 ease-in-out",
                  "shadow-lg bg-green-500 hover:bg-green-600"
                )}
              >
                <MessageCircle className="h-6 w-6 text-white mb-0.5" />
                <span className="text-white text-[10px] font-medium">AI AGENT</span>
              </Button>
            </div>
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
