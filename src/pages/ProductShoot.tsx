
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";

const ProductShoot = () => {
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<'input' | 'gallery'>(isMobile ? 'input' : 'gallery');
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");
  const queryClient = useQueryClient();

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
  });

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const generateImage = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) {
        throw new Error("Please enter a prompt");
      }

      if (!selectedFile) {
        throw new Error("Please upload an image");
      }

      if (!userCredits || userCredits.credits_remaining < 0.2) {
        throw new Error("Insufficient credits. You need 0.2 credits to generate an image.");
      }

      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      formData.append('image', selectedFile);
      formData.append('imageSize', imageSize);
      formData.append('numInferenceSteps', inferenceSteps.toString());
      formData.append('guidanceScale', guidanceScale.toString());
      formData.append('outputFormat', outputFormat);

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setPrompt("");
      clearSelectedFile();
      toast.success("Image generation started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
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

  return (
    <div className="min-h-screen bg-background">
      {isMobile && (
        <MobilePanelToggle
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />
      )}
      <div className={cn(
        "h-screen",
        isMobile ? "block" : "flex"
      )}>
        <InputPanel
          isMobile={isMobile}
          activePanel={activePanel}
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
          activePanel={activePanel}
          images={images}
          isLoading={imagesLoading}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default ProductShoot;
