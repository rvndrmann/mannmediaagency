
import { useState, useEffect } from "react";
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
  const [isRemoteImage, setIsRemoteImage] = useState(false);

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
      setIsRemoteImage(false);
      toast.success("Image uploaded successfully");
    }
  };

  const handleClearFile = () => {
    if (productShotPreview && !isRemoteImage) {
      URL.revokeObjectURL(productShotPreview);
    }
    setProductShotPreview(null);
    setProductShotFile(null);
    setIsRemoteImage(false);
    toast.info("Image cleared");
  };

  // Function to directly set the preview URL from a remote source
  const setProductShotPreviewUrl = (url: string) => {
    console.log("Setting product shot preview URL:", url);
    setProductShotPreview(url);
    setIsRemoteImage(true);
    // We don't have the actual file here, but we'll need to fetch it before generating
    setProductShotFile(null);
    toast.success("Default image selected");
  };

  // Function to fetch a remote image as a File object
  const fetchRemoteImage = async (url: string): Promise<File | null> => {
    try {
      console.log("Fetching remote image:", url);
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = url.split('/').pop() || 'remote-image.jpg';
      const file = new File([blob], filename, { type: blob.type });
      console.log("Remote image fetched successfully");
      return file;
    } catch (error) {
      console.error('Error fetching remote image:', error);
      toast.error("Failed to process the remote image");
      return null;
    }
  };

  const handleGenerate = async () => {
    console.log("Handle generate called with:", {
      prompt: productShotPrompt,
      preview: productShotPreview,
      isRemoteImage
    });
    
    if (!productShotPrompt.trim()) {
      toast.error("Please provide a prompt");
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
      
      // If we have a remote image URL but no file, fetch the file first
      let fileToUse = productShotFile;
      if (!fileToUse && productShotPreview && isRemoteImage) {
        toast.info("Preparing remote image...");
        console.log("Fetching remote image file from URL:", productShotPreview);
        fileToUse = await fetchRemoteImage(productShotPreview);
        if (!fileToUse) {
          setIsGenerating(false);
          return; // Error already shown by fetchRemoteImage
        }
      }
      
      if (!fileToUse) {
        toast.error("Please provide an image");
        setIsGenerating(false);
        return;
      }

      toast.success("Starting image generation...");

      console.log("Starting generation with settings:", {
        prompt: productShotPrompt,
        imageSize: imageSize,
        inferenceSteps: inferenceSteps, 
        guidanceScale: guidanceScale,
        outputFormat: outputFormat
      });

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(fileToUse);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;

        // Call the Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('generate-product-image', {
          body: {
            prompt: productShotPrompt,
            image: base64Image,
            imageSize: imageSize,
            numInferenceSteps: inferenceSteps,
            guidanceScale: guidanceScale,
            outputFormat: outputFormat
          }
        });

        console.log("API response received:", { data, error });

        if (error) {
          console.error('Generation error:', error);
          toast.error(error.message || "Failed to generate image");
          setIsGenerating(false);
          return;
        }

        if (data?.error) {
          console.error('API error:', data.error);
          toast.error(data.error);
          setIsGenerating(false);
          return;
        }

        if (data?.imageUrl) {
          toast.success("Image generated successfully!");
          // We'll rely on the database query to refresh the images
        }
        
        setIsGenerating(false);
      };

      reader.onerror = (error) => {
        console.error('File reading error:', error);
        toast.error("Failed to process the image");
        setIsGenerating(false);
      };

    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Failed to generate image");
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
      isGenerating,
      isRemoteImage
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
      setProductShotPreview: setProductShotPreviewUrl
    }
  };
}
