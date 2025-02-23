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

interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleGenerateV1 = async () => {
    // Implementation will be added in the next iteration
    console.log("Generate V1 clicked");
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `product-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">AI Agent</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChatSection
            messages={messages}
            input={input}
            isLoading={isLoading}
            userCredits={userCredits}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />

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
              prompt,
              previewUrl,
              imageSize,
              inferenceSteps,
              guidanceScale,
              outputFormat,
              productImages: productImages || [],
              imagesLoading,
              creditsRemaining: userCreditData?.credits_remaining ?? 0,
              onPromptChange: setPrompt,
              onFileSelect: handleFileSelect,
              onClearFile: clearSelectedFile,
              onImageSizeChange: setImageSize,
              onInferenceStepsChange: setInferenceSteps,
              onGuidanceScaleChange: setGuidanceScale,
              onOutputFormatChange: setOutputFormat,
              onGenerate: handleGenerateV1,
              onDownload: handleDownload
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
