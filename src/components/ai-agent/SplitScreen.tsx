import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { MobileToolNav } from "./MobileToolNav";
import { ToolSelector } from "./ToolSelector";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { Badge } from "@/components/ui/badge";

interface ProductShotV1Props {
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
}

interface ImageToVideoProps {
  isMobile: boolean;
  previewUrl: string | null;
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
  activeTool?: string;  // New prop for active tool
  onToolSelect?: (tool: string) => void;  // New prop for tool selection
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
  onBack?: () => void;
}

export const SplitScreen = ({
  isMobile,
  messages,
  input,
  isLoading,
  userCredits,
  activeTool: externalActiveTool,
  onToolSelect: externalOnToolSelect,
  productShotV2,
  productShotV1,
  imageToVideo,
  onInputChange,
  onSubmit,
  onBack,
}: SplitScreenProps) => {
  const [internalActiveTool, setInternalActiveTool] = useState('product-shot-v1');
  const [showChat, setShowChat] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  
  const activeTool = externalActiveTool !== undefined ? externalActiveTool : internalActiveTool;

  const hasActiveCommand = messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' && 
    messages[messages.length - 1].command !== undefined;

  const handleToolSelect = (tool: string) => {
    setIsTransitioning(true);
    if (tool === 'ai-agent') {
      setShowChat(true);
      setTimeout(() => setIsChatVisible(true), 50);
    } else {
      setShowChat(false);
      setIsChatVisible(false);
      
      if (externalOnToolSelect) {
        externalOnToolSelect(tool);
      } else {
        setInternalActiveTool(tool);
      }
    }
    setTimeout(() => setIsTransitioning(false), 300);
  };

  useEffect(() => {
    if (externalActiveTool && externalActiveTool !== 'ai-agent') {
      setShowChat(false);
      setIsChatVisible(false);
    }
  }, [externalActiveTool]);

  useEffect(() => {
    return () => {
      setIsChatVisible(false);
    };
  }, []);

  return (
    <div className="relative min-h-screen h-full bg-[#1A1F2C] pb-[4.5rem] md:pb-0">
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isMobile ? "" : "flex h-screen"
        )}
      >
        {hasActiveCommand && (
          <div className="absolute top-4 right-4 z-50">
            <Badge variant="command" className="px-3 py-1.5 text-sm">
              Executing {messages[messages.length - 1].command?.feature} command
            </Badge>
          </div>
        )}

        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "fixed inset-0 z-30 animate-in fade-in slide-in pb-36" 
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
            onBack={onBack}
            isVisible={isChatVisible}
          />
        </div>

        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "hidden" 
                : cn(
                    "h-[calc(100vh-4.5rem)]",
                    isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  )
            ) : "flex-1 overflow-hidden"
          )}
        >
          {!isMobile && (
            <ToolSelector 
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
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
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <MobileToolNav
            activeTool={showChat ? 'ai-agent' : activeTool}
            onToolSelect={handleToolSelect}
          />
        </div>
      )}
    </div>
  );
};
