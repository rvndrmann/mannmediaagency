import { useState, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useProductShotV1 = () => {
  const [state, setState] = useState({
    productShotPrompt: "",
    productShotPreview: null as string | null,
    imageSize: "1024x1024",
    inferenceSteps: 30,
    guidanceScale: 7.5,
    outputFormat: "png",
    productImages: [] as string[],
    imagesLoading: false,
    isGenerating: false,
  });

  const actions = {
    setProductShotPrompt: (value: string) => 
      setState(prev => ({ ...prev, productShotPrompt: value })),
    handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setState(prev => ({ ...prev, productShotPreview: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    },
    setImageSize: (size: string) => 
      setState(prev => ({ ...prev, imageSize: size })),
    setInferenceSteps: (steps: number) => 
      setState(prev => ({ ...prev, inferenceSteps: steps })),
    setGuidanceScale: (scale: number) => 
      setState(prev => ({ ...prev, guidanceScale: scale })),
    setOutputFormat: (format: string) => 
      setState(prev => ({ ...prev, outputFormat: format })),
    setProductShotPreview: (url: string | null) => 
      setState(prev => ({ ...prev, productShotPreview: url })),
    generateImage: async (prompt: string) => {
      setState(prev => ({ ...prev, isGenerating: true }));
      try {
        // Implement image generation logic here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error generating image:', error);
      } finally {
        setState(prev => ({ ...prev, isGenerating: false }));
      }
    },
    downloadImage: async (url: string, filename: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${filename}.${state.outputFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading image:', error);
      }
    }
  };

  return {
    state,
    actions
  };
};
