
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface ImageGenerationOptions {
  prompt: string;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
}

export const useImageGeneration = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    mutationFn: async (options: ImageGenerationOptions) => {
      if (!options.prompt.trim()) {
        throw new Error("Please enter a prompt");
      }

      if (!selectedFile) {
        throw new Error("Please upload an image");
      }

      try {
        const base64Image = await convertFileToBase64(selectedFile);

        const response = await supabase.functions.invoke("generate-product-image", {
          body: {
            prompt: options.prompt.trim(),
            image: base64Image,
            imageSize: options.imageSize,
            numInferenceSteps: options.inferenceSteps,
            guidanceScale: options.guidanceScale,
            outputFormat: options.outputFormat
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

  return {
    selectedFile,
    previewUrl,
    handleFileSelect,
    clearSelectedFile,
    generateImage,
  };
};
