
import { useState, useEffect, useRef } from "react";
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
  
  // Ref to hold the video creation submit function
  const videoSubmitRef = useRef<() => void>(() => {});

  const isAnyGenerating = 
    productShotV1.isGenerating || 
    productShotV2.isGenerating || 
    productShotV2.isSubmitting || 
    imageToVideo.isGenerating;

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

  // Allow the feature panel to set the video submit function
  const setVideoSubmitFunction = (fn: () => void) => {
    videoSubmitRef.current = fn;
  };

  const handleFixButtonClick = () => {
    if (isAnyGenerating) return;
    
    switch (activeTool) {
      case 'product-shot-v1':
        if (productShotV1.prompt && productShotV1.previewUrl) {
          productShotV1.onGenerate();
        }
        break;
      case 'product-shot-v2':
        const submitButton = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
        if (submitButton) submitButton.click();
        break;
      case 'image-to-video':
        if (imageToVideo.prompt && imageToVideo.previewUrl) {
          imageToVideo.onGenerate(imageToVideo.prompt, imageToVideo.aspectRatio);
        }
        break;
      case 'faceless-video':
        // Use our ref to call the video submit function
        videoSubmitRef.current();
        break;
      case 'ai-agent':
        const chatForm = document.querySelector('form.ai-chat-form') as HTMLFormElement;
        if (chatForm) chatForm.requestSubmit();
        break;
    }
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
          />
        </div>

        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "hidden" 
                : cn(
                    "pb-36",
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
          
          <FeaturePanel
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={productShotV1}
            imageToVideo={imageToVideo}
            activeTool={activeTool}
            onSetVideoSubmitFunction={setVideoSubmitFunction}
          />
        </div>
      </div>

      {isMobile && (
        <MobileToolNav
          activeTool={showChat ? 'ai-agent' : activeTool}
          onToolSelect={handleToolSelect}
          onFixButtonClick={handleFixButtonClick}
          isGenerating={isAnyGenerating}
        />
      )}
    </div>
  );
};
