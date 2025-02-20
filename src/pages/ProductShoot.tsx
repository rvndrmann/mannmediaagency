
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { useNavigate } from "react-router-dom";
import { Loader2, Button } from "@/components/ui";

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
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
    retry: false,
  });

  const { data: userCredits, error: creditsError } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: images, isLoading: imagesLoading, error: imagesError } = useQuery({
    queryKey: ["product-images", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
    refetchInterval: 5000,
  });

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
      if (!session?.user?.id) {
        throw new Error("Please sign in to generate images");
      }

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
      queryClient.invalidateQueries({ queryKey: ["product-images", session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setPrompt("");
      clearSelectedFile();
      toast.success("Image generation started");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate image";
      const isCreditsError = message.toLowerCase().includes('credits');
      
      console.error("Image generation error:", error);
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

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500">Please sign in to access this page</p>
          <Button onClick={() => navigate("/auth/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (creditsError || imagesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500">Failed to load data. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobilePanelToggle title="Product Shoot" />
      <div className={cn(
        "flex flex-1",
        isMobile ? "flex-col" : "flex-row"
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
        <GalleryPanel
          isMobile={isMobile}
          images={images}
          isLoading={imagesLoading}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default ProductShoot;
