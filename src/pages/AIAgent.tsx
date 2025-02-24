
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageSquare, Settings } from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSection } from "@/components/ai-agent/ChatSection";
import { FeaturePanel } from "@/components/ai-agent/FeaturePanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isFeaturePanelOpen, setIsFeaturePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'features'>('chat');

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

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F2C]/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="w-8 h-8 text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-white">AI Agent</h1>
          </div>
          {isMobile && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "w-8 h-8 text-white hover:bg-white/10",
                  activeTab === 'chat' && "bg-white/10"
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Sheet open={isFeaturePanelOpen} onOpenChange={setIsFeaturePanelOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-8 h-8 text-white hover:bg-white/10",
                      activeTab === 'features' && "bg-white/10"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] bg-[#1A1F2C] border-t border-white/10 p-0">
                  <div className="h-full overflow-auto">
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
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto pt-16">
        <div className={cn(
          "grid gap-6",
          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}>
          <div className={cn(
            "transition-opacity duration-300",
            isMobile && activeTab !== 'chat' && "hidden"
          )}>
            <ChatSection
              messages={messages}
              input={input}
              isLoading={isLoading}
              userCredits={userCredits}
              onInputChange={setInput}
              onSubmit={handleSubmit}
            />
          </div>
          
          {!isMobile && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
