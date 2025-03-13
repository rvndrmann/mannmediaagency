
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoTemplate } from "@/types/custom-order";

export const useTemplateVideo = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFromTemplate = async (
    template: VideoTemplate,
    imageUrl: string,
    userId: string
  ) => {
    if (!imageUrl) {
      toast.error("Please provide an image");
      return null;
    }

    try {
      setIsGenerating(true);

      // First, check if user has enough credits
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", userId)
        .single();

      if (creditsError) throw creditsError;

      if (!userCredits || userCredits.credits_remaining < (template.credits_cost || 0)) {
        throw new Error(`Insufficient credits. You need ${template.credits_cost} credits for this template.`);
      }

      // Convert duration to string if it's a number
      const durationString = typeof template.duration === 'number' 
        ? template.duration.toString() 
        : template.duration;

      // Create the job record in the database
      const { data: jobData, error: jobError } = await supabase
        .from('video_generation_jobs')
        .insert({
          source_image_url: imageUrl,
          duration: durationString,
          aspect_ratio: template.aspect_ratio,
          status: 'in_queue',
          user_id: userId,
          file_name: 'template-video.jpg',
          content_type: 'image/jpeg',
          settings: { template_id: template.id }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call the edge function
      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          job_id: jobData.id,
          prompt: template.prompt_template,
          image_url: imageUrl,
          duration: durationString,
          aspect_ratio: template.aspect_ratio,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast.success("Video generation started");
      return jobData.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate video";
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateFromTemplate
  };
};
