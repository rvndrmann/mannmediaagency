
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "../types";

export const imageToVideoTool: ToolDefinition = {
  name: "image-to-video",
  description: "Convert an image to a video with motion",
  parameters: {
    prompt: {
      type: "string",
      description: "Description of the video to generate"
    },
    imageUrl: {
      type: "string",
      description: "URL of the source image"
    },
    aspectRatio: {
      type: "string",
      description: "Aspect ratio of the video",
      enum: ["16:9", "9:16", "4:3", "1:1"],
      default: "16:9"
    },
    duration: {
      type: "string",
      description: "Duration of the video in seconds",
      default: "5"
    }
  },
  requiredCredits: 1,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 1) {
        return {
          success: false,
          message: "Insufficient credits to generate a video. You need at least 1 credit."
        };
      }

      // Get the image URL - either from the params or from attachments
      let imageUrl = params.imageUrl;
      if (!imageUrl && context.attachments?.length > 0) {
        const imageAttachment = context.attachments.find(att => att.type === "image");
        if (imageAttachment) {
          imageUrl = imageAttachment.url;
        }
      }

      if (!imageUrl) {
        return {
          success: false,
          message: "No image URL provided. Please provide an image URL or attach an image."
        };
      }

      // Insert job record in the database
      const { data: jobData, error: jobError } = await supabase
        .from('video_generation_jobs')
        .insert({
          prompt: params.prompt,
          source_image_url: imageUrl,
          duration: params.duration || "5",
          aspect_ratio: params.aspectRatio || "16:9",
          status: 'in_queue',
          user_id: context.userId,
          settings: {
            prompt: params.prompt,
            imageUrl: imageUrl,
            aspectRatio: params.aspectRatio || "16:9",
            duration: params.duration || "5"
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call the edge function to start the generation
      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          job_id: jobData.id,
          prompt: params.prompt,
          image_url: imageUrl,
          duration: params.duration || "5",
          aspect_ratio: params.aspectRatio || "16:9",
        },
      });

      if (response.error) throw new Error(response.error.message);

      return {
        success: true,
        message: "Video generation started successfully. You'll be notified when it's ready.",
        data: {
          jobId: jobData.id,
          status: "in_queue"
        }
      };
    } catch (error) {
      console.error("Error in image-to-video tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      };
    }
  }
};
