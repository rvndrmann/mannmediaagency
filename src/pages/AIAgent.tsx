
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSection } from "@/components/ai-agent/ChatSection";
import { FeaturePanel } from "@/components/ai-agent/FeaturePanel";
import { ToolSelector } from "@/components/ai-agent/ToolSelector";
import { cn } from "@/lib/utils";

interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTool, setActiveTool] = useState("product-shot-v1");
  const [splitRatio, setSplitRatio] = useState(50); // percentage for left pane

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  } = useAIChat();

  const { 
    isGenerating: isGeneratingV2, 
    isSubmitting: isSubmittingV2, 
    generatedImages: generatedImagesV2, 
    handleGenerate: handleGenerateV2
  } = useProductShoot();

  const { data: userCreditData } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining, user_id")
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserCredits;
    },
  });

  const { data: productImages, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      if (!userCreditData?.user_id) return [];

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq('user_id', userCreditData.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userCreditData?.user_id,
  });

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
    <div className="min-h-screen bg-[#1A1F2C]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F2C]/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-white ml-2">AI Agent</h1>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="pt-16">
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
              onInputChange={setInput}
              onSubmit={handleSubmit}
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
                productShotV2={{
                  onSubmit: handleGenerateV2,
                  isGenerating: isGeneratingV2,
                  isSubmitting: isSubmittingV2,
                  availableCredits: userCreditData?.credits_remaining ?? 0,
                  generatedImages: generatedImagesV2
                }}
                productShotV1={{
                  isMobile,
                  prompt: "",
                  previewUrl: null,
                  imageSize: "square_hd",
                  inferenceSteps: 8,
                  guidanceScale: 3.5,
                  outputFormat: "png",
                  productImages: productImages || [],
                  imagesLoading,
                  creditsRemaining: userCreditData?.credits_remaining ?? 0,
                  onPromptChange: () => {},
                  onFileSelect: () => {},
                  onClearFile: () => {},
                  onImageSizeChange: () => {},
                  onInferenceStepsChange: () => {},
                  onGuidanceScaleChange: () => {},
                  onOutputFormatChange: () => {},
                  onGenerate: () => {},
                  onDownload: () => {}
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
