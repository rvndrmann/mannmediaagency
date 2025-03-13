
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { ChatSection } from "@/components/product-shoot/ChatSection";
import { useNavigate } from "react-router-dom";
import { Message } from "@/types/message";
import { useProductShotV1 } from "@/hooks/use-product-shot-v1";

const ProductShoot = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatExpanded, setChatExpanded] = useState(true);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
  });

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining, user_id")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Use the same hook that's used in AIAgent without passing arguments
  const { state: productShotState, actions: productShotActions } = useProductShotV1();

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      if (!session?.user.id) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const handleSetPreviewUrl = (event: CustomEvent) => {
      if (event.detail) {
        productShotActions.setProductShotPreview(event.detail);
      }
    };

    window.addEventListener('set-preview-url', handleSetPreviewUrl as EventListener);

    return () => {
      window.removeEventListener('set-preview-url', handleSetPreviewUrl as EventListener);
    };
  }, [productShotActions]);

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
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#121418]">
      <MobilePanelToggle title="Product Shot V1" />
      <div className={cn(
        "transition-all duration-300 relative",
        isMobile ? "flex flex-col h-[calc(100vh-64px)]" : "flex h-[calc(100vh-64px-3rem)]",
        chatExpanded && isMobile && "h-[calc(70vh-64px)]"
      )}>
        <div className={cn(
          "bg-[#1A1F2C]/80 backdrop-blur-xl border-white/10",
          isMobile ? "w-full border-b max-h-[60vh] overflow-y-auto" : "w-1/3 min-w-[380px] border-r flex flex-col"
        )}>
          <InputPanel
            isMobile={isMobile}
            prompt={productShotState.productShotPrompt}
            onPromptChange={productShotActions.setProductShotPrompt}
            previewUrl={productShotState.productShotPreview}
            onFileSelect={productShotActions.handleFileSelect}
            onClearFile={productShotActions.handleClearFile}
            imageSize={productShotState.imageSize}
            onImageSizeChange={productShotActions.setImageSize}
            inferenceSteps={productShotState.inferenceSteps}
            onInferenceStepsChange={productShotActions.setInferenceSteps}
            guidanceScale={productShotState.guidanceScale}
            onGuidanceScaleChange={productShotActions.setGuidanceScale}
            outputFormat={productShotState.outputFormat}
            onOutputFormatChange={productShotActions.setOutputFormat}
            onGenerate={productShotActions.handleGenerate}
            isGenerating={productShotState.isGenerating}
            creditsRemaining={userCredits?.credits_remaining || 0}
            messages={messages}
          />
        </div>
        <div className={cn(
          "bg-[#121418]",
          isMobile ? "w-full flex-1 overflow-y-auto" : "flex-1 overflow-hidden"
        )}>
          <GalleryPanel
            isMobile={isMobile}
            images={images}
            isLoading={imagesLoading}
            onDownload={handleDownload}
          />
        </div>
      </div>
      
      <ChatSection 
        expanded={chatExpanded}
        onToggle={() => setChatExpanded(!chatExpanded)}
      />
    </div>
  );
};

export default ProductShoot;
