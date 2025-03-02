
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

export type ImageSize = "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

export function useProductShotV1(userCredits: UserCredits | null) {
  const [productShotPrompt, setProductShotPrompt] = useState("");
  const [productShotPreview, setProductShotPreview] = useState<string | null>(null);
  const [productShotFile, setProductShotFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
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
      toast.success("Image uploaded successfully");
    }
  };

  const handleClearFile = () => {
    if (productShotPreview) {
      URL.revokeObjectURL(productShotPreview);
    }
    setProductShotPreview(null);
    setProductShotFile(null);
    toast.info("Image cleared");
  };

  // Add a method to directly set the preview URL (needed for custom events)
  const setProductShotPreviewUrl = (url: string) => {
    setProductShotPreview(url);
    // We don't have the actual file here, so we won't set productShotFile
    // This is used only for display purposes in the UI
  };

  const handleGenerate = async () => {
    if (!productShotFile || !productShotPrompt.trim()) {
      toast.error("Please provide both an image and a prompt");
      return;
    }

    if (!userCredits || userCredits.credits_remaining < 0.2) {
      toast.error("Insufficient credits. You need at least 0.2 credits to generate an image.");
      return;
    }

    if (isGenerating) {
      toast.info("Image generation already in progress...");
      return;
    }

    try {
      setIsGenerating(true);
      toast.success("Starting image generation...");

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(productShotFile);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;

        // Call the Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('generate-product-image', {
          body: {
            prompt: productShotPrompt,
            image: base64Image,
            imageSize,
            numInferenceSteps: inferenceSteps,
            guidanceScale,
            outputFormat
          }
        });

        if (error) {
          console.error('Generation error:', error);
          toast.error(error.message || "Failed to generate image");
          return;
        }

        if (data.error) {
          console.error('API error:', data.error);
          toast.error(data.error);
          return;
        }

        if (data.imageUrl) {
          toast.success("Image generated successfully!");
        }
      };

      reader.onerror = (error) => {
        console.error('File reading error:', error);
        toast.error("Failed to process the image");
      };

    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const { data: productImages, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      if (!userCredits?.user_id) return [];

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq('user_id', userCredits.user_id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load image history");
        throw error;
      }
      return data || [];
    },
    enabled: !!userCredits?.user_id,
  });

  return {
    state: {
      productShotPrompt,
      productShotPreview,
      imageSize,
      inferenceSteps,
      guidanceScale,
      outputFormat,
      productImages,
      imagesLoading,
      isGenerating
    },
    actions: {
      setProductShotPrompt,
      handleFileSelect,
      handleClearFile,
      setImageSize,
      setInferenceSteps,
      setGuidanceScale,
      setOutputFormat,
      handleGenerate,
      setProductShotPreview: setProductShotPreviewUrl  // Add the new action
    }
  };
}
