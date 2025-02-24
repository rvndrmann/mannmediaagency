
import { useNavigate } from "react-router-dom";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/ai-agent/Header";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";

interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      <Header onBack={() => navigate(-1)} />
      <SplitScreen
        isMobile={isMobile}
        messages={messages}
        input={input}
        isLoading={isLoading}
        userCredits={userCredits}
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
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AIAgent;
