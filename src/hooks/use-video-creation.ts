
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
        background_music: backgroundMusicUrl,
        story_type_id: story_type_id,
        user_id: user.id,
      };

      // If a product photo URL is provided, set the "PRODUCT IMAGE" column to 1
      // This indicates that a product image is associated with this story
      if (productPhotoUrl) {
        storyData["PRODUCT IMAGE"] = 1;
      }

      // Insert the story with the product image flag
      const { data: newStory, error } = await supabase
        .from("stories")
        .insert([storyData])
        .select()
        .single();

      if (error) throw error;

      // If we have a product photo URL and a new story was created successfully,
      // update any relevant metadata or linked tables
      if (productPhotoUrl && newStory) {
        const storyId = newStory["stories id"];

        // You might want to store the actual URL in a separate table or metadata
        // Here we'll create an entry in story_metadata if it doesn't exist already
        const { error: metadataError } = await supabase
          .from("story_metadata")
          .upsert({
            story_id: storyId,
            additional_context: `Product photo URL: ${productPhotoUrl}`,
          }, {
            onConflict: "story_id"
          });

        if (metadataError) {
          console.error("Error saving product photo metadata:", metadataError);
          // Continue anyway as this is not critical
        }
      }

      toast({
        title: "Success",
        description: "Your video has been created successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
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
