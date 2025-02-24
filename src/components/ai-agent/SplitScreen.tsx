
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { ToolSelector } from "./ToolSelector";
import { Camera, Video, FileText, Sparkles } from "lucide-react";

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
    onSubmit: (data: any) => void;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: any[];
  };
  productShotV1: ProductShotV1Props;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const toolButtons = [
  {
    id: 'product-shot-v1',
    name: 'Product Shot V1',
    icon: <Camera className="h-5 w-5" />,
    gradient: 'from-[#9b87f5] to-[#7E69AB]'
  },
  {
    id: 'product-shot-v2',
    name: 'Product Shot V2',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-[#8B5CF6] to-[#6E59A5]'
  },
  {
    id: 'image-to-video',
    name: 'Image to Video',
    icon: <Video className="h-5 w-5" />,
    gradient: 'from-[#7E69AB] to-[#6E59A5]'
  },
  {
    id: 'faceless-video',
    name: 'Faceless Video',
    icon: <FileText className="h-5 w-5" />,
    gradient: 'from-[#6E59A5] to-[#1A1F2C]'
  }
];

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

  return (
    <div 
      className={cn(
        "flex",
        isMobile ? "flex-col min-h-screen pb-safe-area-inset-bottom" : "h-[calc(100vh-4rem)]"
      )}
    >
      {/* Chat Section - Full height on mobile */}
      <div 
        className={cn(
          "relative bg-[#1A1F2C] border-white/10",
          isMobile ? "min-h-screen w-full border-b" : "flex-none w-[50%] border-r"
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

      {/* Tools Section - Scrollable on mobile */}
      <div 
        className={cn(
          "relative bg-[#1A1F2C]",
          isMobile ? "min-h-screen w-full" : "flex-1"
        )}
      >
        {/* Custom Tool Selector for Mobile */}
        {isMobile ? (
          <div className="sticky top-0 z-10 bg-[#1A1F2C] border-b border-white/10 p-4 space-y-3">
            <h2 className="text-white text-lg font-semibold mb-3">Available Tools</h2>
            <div className="grid grid-cols-2 gap-3">
              {toolButtons.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg text-white",
                    "transition-all duration-200 transform hover:scale-105",
                    "bg-gradient-to-r",
                    tool.gradient,
                    activeTool === tool.id ? "ring-2 ring-white/50" : ""
                  )}
                >
                  {tool.icon}
                  <span className="mt-2 text-sm font-medium">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ToolSelector 
            activeTool={activeTool}
            onToolSelect={setActiveTool}
          />
        )}
        
        <div className={cn(
          "h-[calc(100%-3rem)]",
          isMobile && "mt-4 pb-16" // Add bottom padding on mobile
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
