
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useStoryCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createStory = async (
    script: string,
    style: string,
    readyToGo: boolean,
    backgroundMusic: string | null
  ) => {
    if (!script.trim()) {
      toast({
        title: "Error",
        description: "Please generate or write a script first",
        variant: "destructive",
      });
      return false;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to create a video",
          variant: "destructive",
        });
        return false;
      }

      // Check user credits
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creditsError) {
        throw creditsError;
      }

      if (!userCredits || userCredits.credits_remaining < 20) {
        toast({
          title: "Error",
          description: "Not enough credits to create a video. Each video costs 20 credits.",
          variant: "destructive",
        });
        return false;
      }

      // Get story type id based on style name
      const { data: storyTypes, error: storyTypeError } = await supabase
        .from("story_type")
        .select("id")
        .eq("story_type", style);

      if (storyTypeError) {
        throw storyTypeError;
      }

      if (!storyTypes || storyTypes.length === 0) {
        toast({
          title: "Error",
          description: "Selected style not found",
          variant: "destructive",
        });
        return false;
      }

      // Use the first matching story type
      const storyType = storyTypes[0];

      // Insert the story
      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          source: script,
          story_type_id: storyType.id,
          ready_to_go: readyToGo,
          background_music: backgroundMusic,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Video creation started successfully!",
      });

      return true;
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createStory,
  };
};
