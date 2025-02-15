
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { useNavigate } from "react-router-dom";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { useGallery } from "@/hooks/use-gallery";
import { useUserCredits } from "@/hooks/use-user-credits";

const ProductShoot = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");

  // Check authentication status
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

  const {
    previewUrl,
    handleFileSelect,
    clearSelectedFile,
    generateImage,
  } = useImageGeneration();

  const { images, imagesLoading, handleDownload } = useGallery(!!session);
  const userCredits = useUserCredits(!!session);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePanelToggle title="Product Shoot" />
      <div className={cn(
        "flex-1 flex min-h-0",
        isMobile ? "flex-col" : "flex"
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
          onGenerate={() => generateImage.mutate({
            prompt,
            imageSize,
            inferenceSteps,
            guidanceScale,
            outputFormat
          })}
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
