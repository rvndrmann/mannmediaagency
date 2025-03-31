
// Import necessary dependencies and types
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { Json } from "@/integrations/supabase/types";
import { historyService } from "./product-shoot/history-service";

// Define types
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  status?: string;
}

export interface ProductShootSettings {
  prompt: string;
  outputFormat: string;
  imageWidth: number;
  imageHeight: number;
  quality: number;
  seed?: number;
  scale?: number;
}

export function useProductShoot() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [defaultImages, setDefaultImages] = useState<GeneratedImage[]>([]);
  const [settings, setSettings] = useState<ProductShootSettings>({
    prompt: "",
    outputFormat: "png",
    imageWidth: 1024,
    imageHeight: 1024,
    quality: 80,
    seed: undefined,
    scale: undefined,
  });
  const { toast } = useToast();

  // Load saved images on component mount
  useEffect(() => {
    fetchSavedImages();
    fetchDefaultImages();
  }, []);

  // Fetch saved images from database
  const fetchSavedImages = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from("product_shots")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("visibility", "saved")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedImages: GeneratedImage[] = data.map((item) => ({
          id: item.id,
          url: item.result_url,
          prompt: item.prompt,
          createdAt: item.created_at,
          status: item.status
        }));
        setSavedImages(formattedImages);
      }
    } catch (error) {
      console.error("Error fetching saved images:", error);
      toast({
        title: "Error",
        description: "Failed to load saved images",
        variant: "destructive",
      });
    }
  };

  // Fetch default images
  const fetchDefaultImages = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from("product_shots")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("visibility", "default")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedImages: GeneratedImage[] = data.map((item) => ({
          id: item.id,
          url: item.result_url,
          prompt: item.prompt,
          createdAt: item.created_at,
          status: item.status
        }));
        setDefaultImages(formattedImages);
      }
    } catch (error) {
      console.error("Error fetching default images:", error);
      toast({
        title: "Error",
        description: "Failed to load default images",
        variant: "destructive",
      });
    }
  };

  // Generate image function
  const generateImage = async (customSettings?: Partial<ProductShootSettings>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate images",
          variant: "destructive",
        });
        return;
      }

      setIsGenerating(true);
      const currentSettings = { ...settings, ...customSettings };

      // If prompt is empty, show error
      if (!currentSettings.prompt.trim()) {
        toast({
          title: "Prompt required",
          description: "Please enter a prompt for the image",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Call function to generate image
      const { data, error } = await supabase.functions.invoke(
        "generate-product-shot",
        {
          body: {
            prompt: currentSettings.prompt,
            outputFormat: currentSettings.outputFormat,
            width: currentSettings.imageWidth,
            height: currentSettings.imageHeight,
            quality: currentSettings.quality,
            seed: currentSettings.seed,
            scale: currentSettings.scale,
          },
        }
      );

      if (error) throw error;

      if (data && data.id) {
        // Add to generated images
        const newImage: GeneratedImage = {
          id: data.id,
          url: data.url,
          content_type: data.content_type,
          status: "completed",
          prompt: currentSettings.prompt,
          createdAt: new Date().toISOString()
        };

        setGeneratedImages((prev) => [newImage, ...prev]);

        // Show success message
        toast({
          title: "Success",
          description: "Image generated successfully",
        });

        // Refresh history
        await historyService.getHistory();
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description:
          "Failed to generate image. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save image to collection
  const saveImage = async (imageId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { error } = await supabase
        .from("product_shots")
        .update({ visibility: "saved" })
        .eq("id", imageId)
        .eq("user_id", userData.user.id);

      if (error) throw error;

      // Update the local state
      const imageToSave = generatedImages.find((img) => img.id === imageId);
      if (imageToSave) {
        setSavedImages((prev) => [imageToSave, ...prev]);
      }

      toast({
        title: "Success",
        description: "Image saved to your collection",
      });
    } catch (error) {
      console.error("Error saving image:", error);
      toast({
        title: "Error",
        description: "Failed to save image",
        variant: "destructive",
      });
    }
  };

  // Set image as default
  const setAsDefault = async (imageId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // First update existing default to saved
      const { error: updateError } = await supabase
        .from("product_shots")
        .update({ visibility: "saved" })
        .eq("visibility", "default")
        .eq("user_id", userData.user.id);

      if (updateError) throw updateError;

      // Then set the new default
      const { error } = await supabase
        .from("product_shots")
        .update({ visibility: "default" })
        .eq("id", imageId)
        .eq("user_id", userData.user.id);

      if (error) throw error;

      // Update local state
      const newDefault = [...savedImages, ...generatedImages].find(
        (img) => img.id === imageId
      );

      if (newDefault) {
        // Move old defaults to saved
        setSavedImages((prev) => [...prev, ...defaultImages]);
        // Set new default
        setDefaultImages([newDefault]);
      }

      toast({
        title: "Success",
        description: "Image set as default",
      });
    } catch (error) {
      console.error("Error setting default image:", error);
      toast({
        title: "Error",
        description: "Failed to set default image",
        variant: "destructive",
      });
    }
  };

  return {
    settings,
    setSettings,
    isGenerating,
    generateImage,
    generatedImages,
    savedImages,
    defaultImages,
    saveImage,
    setAsDefault,
    fetchSavedImages,
    fetchDefaultImages,
  };
}
