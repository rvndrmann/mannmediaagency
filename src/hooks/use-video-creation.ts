
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
  voice: string;
}

export const useVideoCreation = ({ onSuccess }: UseVideoCreationProps) => {
  // Removed isSubmitting state
  const { toast } = useToast();

  const createVideo = async ({
    source,
    readyToGo,
    backgroundMusicUrl,
    productPhotoUrl,
    style,
    voice
  }: CreateVideoParams) => {
    if (!source.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script or idea",
        variant: "destructive",
      });
      return;
    }

    // Removed setIsSubmitting(true)
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
        // background_music: backgroundMusicUrl, // Remove direct assignment here
        story_type_id: story_type_id,
        user_id: user.id,
        "choose voice": voice,
      } as any; // Use 'as any' temporarily to allow adding property conditionally

      // Only add background_music if a URL exists
      if (backgroundMusicUrl) {
        storyData.background_music = backgroundMusicUrl;
      }

      // If a product photo URL is provided, set the "PRODUCT IMAGE" column to 1
      // This indicates that a product image is associated with this story
      // If a product photo URL is provided, store it in the "PRODUCT IMAGE" column
      if (productPhotoUrl) {
        storyData["PRODUCT IMAGE"] = productPhotoUrl; // Store the URL string
      }
      // else { // Optional: Explicitly set to null if no photo, depending on column constraints
      //   storyData["PRODUCT IMAGE"] = null;
      // }

      // Insert the story data
      const { data: newStory, error } = await supabase
        .from("stories")
        .insert([storyData])
        .select()
        .single();

      if (error) throw error;

      // Removed the redundant upsert to story_metadata as the URL is now in the stories table

      // State reset moved to finally block
      toast({
        title: "Success",
        description: "Your video has been created successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating video:", error);
      // State reset moved to finally block
      toast({
        title: "Error",
        description: `Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
    // Removed finally block as state is managed in the component
  };

  return {
    // Removed isSubmitting from return
    createVideo
  };
};
