
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseVideoCreationProps {
  onSuccess: () => void;
}

interface CreateVideoParams {
  source: string;
  readyToGo: boolean;
  backgroundMusicUrl: string | null;
  productPhotoUrl: string | null;
  style: string;
}

export const useVideoCreation = ({ onSuccess }: UseVideoCreationProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const createVideo = async ({
    source,
    readyToGo,
    backgroundMusicUrl,
    productPhotoUrl,
    style
  }: CreateVideoParams) => {
    if (!source.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script or idea",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const { data: storyTypes } = await supabase
        .from("story_type")
        .select("id, story_type");

      const selectedStoryType = storyTypes?.find(type => type.story_type === style);
      const story_type_id = selectedStoryType?.id || null;

      // Create an object to store the story data
      const storyData = {
        source: source.trim(),
        ready_to_go: readyToGo,
        story_type_id: story_type_id,
        user_id: user.id,
      } as any;

      // Only add background_music if a URL exists
      if (backgroundMusicUrl) {
        storyData.background_music = backgroundMusicUrl;
      }

      // If a product photo URL is provided, store it in the "PRODUCT IMAGE" column
      if (productPhotoUrl) {
        storyData["PRODUCT IMAGE"] = productPhotoUrl;
      }

      // Insert the story data
      const { data: newStory, error } = await supabase
        .from("stories")
        .insert([storyData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your video has been created successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        title: "Error",
        description: `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    createVideo
  };
};
