
import { useNavigate } from "react-router-dom";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/ai-agent/Header";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";
import { useState } from "react";
import { toast } from "sonner";

interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    messages,
    input,
    setInput,
    isLoading,
    userCredits
  } = useAIChat();

  const { 
    isGenerating: isGeneratingV2, 
    isSubmitting: isSubmittingV2, 
    generatedImages: generatedImagesV2, 
    handleGenerate: handleGenerateV2
  } = useProductShoot();

  // Add state management for Product Shot V1
  const [productShotPrompt, setProductShotPrompt] = useState("");
  const [productShotPreview, setProductShotPreview] = useState<string | null>(null);
  const [productShotFile, setProductShotFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");

  // Handlers for Product Shot V1
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setProductShotFile(file);
      const url = URL.createObjectURL(file);
      setProductShotPreview(url);
    }
  };

  const handleClearFile = () => {
    if (productShotPreview) {
      URL.revokeObjectURL(productShotPreview);
    }
    setProductShotPreview(null);
    setProductShotFile(null);
  };

  const handleGenerate = () => {
    // Implement generation logic here
    console.log("Generating with:", {
      prompt: productShotPrompt,
      file: productShotFile,
      imageSize,
      inferenceSteps,
      guidanceScale,
      outputFormat
    });
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Append the user's message to the chat with proper typing
    const userMessage: Message = { role: "user", content: input };
    messages.push(userMessage);

    // Clear the input field
    setInput("");

    // Optimistically update the chat interface with proper typing
    const assistantMessage: Message = { role: "assistant", content: "Loading..." };
    messages.push(assistantMessage);

    // Send the chat history to the API
    fetch("/api/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Replace the "Loading..." message with the actual response
        assistantMessage.content = data.content;
      })
      .catch((error) => {
        console.error("Error:", error);
        assistantMessage.content =
          "Sorry, I encountered an error. Please try again.";
      });
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C] relative">
      <Header onBack={() => navigate(-1)} />
      <div className={`${isMobile ? 'pt-16' : ''}`}>
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
            prompt: productShotPrompt,
            previewUrl: productShotPreview,
            imageSize,
            inferenceSteps,
            guidanceScale,
            outputFormat,
            productImages: productImages || [],
            imagesLoading,
            creditsRemaining: userCreditData?.credits_remaining ?? 0,
            isGenerating: isLoading,
            onPromptChange: setProductShotPrompt,
            onFileSelect: handleFileSelect,
            onClearFile: handleClearFile,
            onImageSizeChange: setImageSize,
            onInferenceStepsChange: setInferenceSteps,
            onGuidanceScaleChange: setGuidanceScale,
            onOutputFormatChange: setOutputFormat,
            onGenerate: handleGenerate,
            onDownload: (url: string) => {
              window.open(url, '_blank');
            }
          }}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AIAgent;
