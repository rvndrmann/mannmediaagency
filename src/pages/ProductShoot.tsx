import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { ChatSection } from "@/components/product-shoot/ChatSection";
import { useNavigate } from "react-router-dom";

const ProductShoot = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");
  const [chatExpanded, setChatExpanded] = useState(true);
  const queryClient = useQueryClient();

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
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

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
      setPreviewUrl(event.detail);
    };

    window.addEventListener('set-preview-url', handleSetPreviewUrl as EventListener);

    return () => {
      window.removeEventListener('set-preview-url', handleSetPreviewUrl as EventListener);
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const generateImage = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) {
        throw new Error("Please enter a prompt");
      }

      if (!selectedFile) {
        throw new Error("Please upload an image");
      }

      try {
        const base64Image = await convertFileToBase64(selectedFile);

        const response = await supabase.functions.invoke("generate-product-image", {
          body: {
            prompt: prompt.trim(),
            image: base64Image,
            imageSize,
            numInferenceSteps: inferenceSteps,
            guidanceScale,
            outputFormat
          },
        });

        if (response.error) {
          let errorMessage = "Failed to generate image";
          
          try {
            const parsedError = JSON.parse(response.error.message);
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch {
            errorMessage = response.error.message;
          }
          
          throw new Error(errorMessage);
        }

        return response.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setPrompt("");
      clearSelectedFile();
      toast.success("Image generation started");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate image";
      const isCreditsError = message.toLowerCase().includes('credits');
      
      toast.error(message, {
        duration: 5000,
        action: isCreditsError ? {
          label: "Buy Credits",
          onClick: () => navigate("/plans")
        } : undefined
      });
    },
  });

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
        isMobile 
          ? "flex flex-col h-[calc(100vh-64px)]" 
          : "flex h-[calc(100vh-64px-3rem)]",
        chatExpanded && isMobile && "h-[calc(70vh-64px)]"
      )}>
        <div className={cn(
          "bg-[#1A1F2C]/80 backdrop-blur-xl border-white/10",
          isMobile 
            ? "w-full border-b max-h-[60vh] overflow-y-auto" 
            : "w-1/3 min-w-[380px] border-r flex flex-col"
        )}>
          <InputPanel
            isMobile={isMobile}
            prompt={prompt}
            onPromptChange={setPrompt}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onClearFile={clearSelectedFile}
            imageSize={imageSize}
            onImageSizeChange={setImageSize}
            inferenceSteps={inferenceSteps}
            onInferenceStepsChange={setInferenceSteps}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            outputFormat={outputFormat}
            onOutputFormatChange={setOutputFormat}
            onGenerate={() => generateImage.mutate()}
            isGenerating={generateImage.isPending}
            creditsRemaining={userCredits?.credits_remaining}
          />
        </div>
        <div className={cn(
          "bg-[#121418]",
          isMobile 
            ? "w-full flex-1 overflow-y-auto" 
            : "flex-1 overflow-hidden"
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
