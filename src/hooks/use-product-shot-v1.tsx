
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserCredits {
  user_id: string;
  credits_remaining: number;
}

export function useProductShotV1(userCredits: UserCredits | null) {
  const [productShotPrompt, setProductShotPrompt] = useState("");
  const [productShotPreview, setProductShotPreview] = useState<string | null>(null);
  const [productShotFile, setProductShotFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");

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
    console.log("Generating with:", {
      prompt: productShotPrompt,
      file: productShotFile,
      imageSize,
      inferenceSteps,
      guidanceScale,
      outputFormat
    });
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

      if (error) throw error;
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
      imagesLoading
    },
    actions: {
      setProductShotPrompt,
      handleFileSelect,
      handleClearFile,
      setImageSize,
      setInferenceSteps,
      setGuidanceScale,
      setOutputFormat,
      handleGenerate
    }
  };
}
