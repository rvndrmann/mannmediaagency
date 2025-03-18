
import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/message";

// Define and export the ImageSize type
export type ImageSize = "square" | "square_hd" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

export const useProductShotV1 = (userCredits: { credits_remaining: number } | null) => {
  const [productShotPrompt, setProductShotPrompt] = useState("");
  const [productShotPreview, setProductShotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>("square");
  const [inferenceSteps, setInferenceSteps] = useState(5);
  const [guidanceScale, setGuidanceScale] = useState(5);
  const [outputFormat, setOutputFormat] = useState("png");
  const [productImages, setProductImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === "string") {
          setProductShotPreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setProductShotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const generateImage = async (prompt: string) => {
    if (!prompt.trim() || !productShotPreview) {
      toast.error("Please provide both a prompt and an image");
      return;
    }

    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("Insufficient credits");
      return;
    }

    setIsGenerating(true);

    try {
      // Insert a record in the database
      const { data: jobData, error: jobError } = await supabase
        .from("image_generation_jobs")
        .insert({
          prompt: prompt,
          source_image_url: productShotPreview,
          image_size: imageSize,
          inference_steps: inferenceSteps,
          guidance_scale: guidanceScale,
          output_format: outputFormat,
          status: "pending",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call the edge function to start the generation
      const { error: functionError } = await supabase.functions.invoke(
        "generate-product-image",
        {
          body: {
            job_id: jobData.id,
            prompt: prompt,
            image_url: productShotPreview,
            image_size: imageSize,
            inference_steps: inferenceSteps,
            guidance_scale: guidanceScale,
            output_format: outputFormat,
          },
        }
      );

      if (functionError) throw functionError;

      toast.success("Image generation started");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to start image generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    generateImage(productShotPrompt);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  return {
    state: {
      productShotPrompt,
      productShotPreview,
      imageSize,
      inferenceSteps,
      guidanceScale,
      outputFormat,
      isGenerating,
      productImages,
      imagesLoading,
    },
    actions: {
      setProductShotPrompt,
      setProductShotPreview,
      handleFileSelect,
      handleClearFile,
      setImageSize,
      setInferenceSteps,
      setGuidanceScale,
      setOutputFormat,
      handleGenerate,
      generateImage,
      downloadImage,
    },
  };
};
