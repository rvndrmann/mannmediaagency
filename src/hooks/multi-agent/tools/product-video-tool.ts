
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "@/hooks/types";

export const productVideoTool: ToolDefinition = {
  name: "product-video",
  description: "Generate a professional product video using AI. You can provide a script, style, background music, and optionally a product photo.",
  parameters: {
    script: {
      type: "string",
      description: "Script or description for the product video"
    },
    style: {
      type: "string",
      description: "Visual style for the video",
      enum: ["modern", "vintage", "minimal", "luxurious", "playful", "corporate"],
      default: "modern"
    },
    productPhotoUrl: {
      type: "string",
      description: "URL of a product photo (optional if an image is attached to the message)",
      required: false
    },
    backgroundMusicUrl: {
      type: "string",
      description: "URL of background music (optional)",
      required: false
    },
    readyToGo: {
      type: "boolean",
      description: "Whether to use ready-to-go mode for faster generation",
      default: false
    }
  },
  requiredCredits: 10,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 10) {
        return {
          success: false,
          message: "Insufficient credits to generate a product video. You need at least 10 credits."
        };
      }

      // Get the product photo URL - either from the params or from attachments
      let productPhotoUrl = params.productPhotoUrl;
      if (!productPhotoUrl && context.attachments?.length > 0) {
        const imageAttachment = context.attachments.find(att => att.type === "image");
        if (imageAttachment) {
          productPhotoUrl = imageAttachment.url;
        }
      }

      // Insert job record in the database
      const { data: videoJob, error: jobError } = await supabase
        .from('video_generation_jobs')
        .insert({
          prompt: params.script,
          source_image_url: productPhotoUrl,
          status: 'in_queue',
          user_id: context.userId,
          settings: {
            script: params.script,
            style: params.style || "modern",
            productPhotoUrl: productPhotoUrl,
            backgroundMusicUrl: params.backgroundMusicUrl,
            readyToGo: params.readyToGo === true
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call the edge function to start the generation
      const response = await supabase.functions.invoke('generate-video-from-template', {
        body: {
          job_id: videoJob.id,
          script: params.script,
          style: params.style || "modern",
          product_photo_url: productPhotoUrl,
          background_music_url: params.backgroundMusicUrl,
          ready_to_go: params.readyToGo === true
        },
      });

      if (response.error) throw new Error(response.error.message);

      return {
        success: true,
        message: "✅ Product video generation started successfully! You'll be notified when it's ready. The process typically takes 3-5 minutes.",
        data: {
          jobId: videoJob.id,
          status: "in_queue"
        }
      };
    } catch (error) {
      console.error("Error in product-video tool:", error);
      return {
        success: false,
        message: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred"
      };
    }
  }
};
