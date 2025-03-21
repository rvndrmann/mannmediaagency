
import { supabase } from "@/integrations/supabase/client";
import { ToolContext, ToolResult } from "@/hooks/types";
import { ToolDefinition } from "../types";

export const productVideoTool: ToolDefinition = {
  name: "product-video",
  description: "Generate a product showcase video based on a product image and description",
  parameters: {
    productName: {
      type: "string",
      description: "Name of the product"
    },
    productDescription: {
      type: "string",
      description: "Detailed description of the product"
    },
    imageUrl: {
      type: "string",
      description: "URL of the product image (optional if an image is attached to the message)",
      required: false
    },
    videoStyle: {
      type: "string",
      description: "Style of the video",
      enum: ["cinematic", "professional", "casual", "elegant", "dynamic"],
      default: "professional"
    },
    duration: {
      type: "number",
      description: "Duration of the video in seconds (15-60)",
      default: 30
    },
    highlightFeatures: {
      type: "boolean",
      description: "Whether to highlight product features in the video",
      default: true
    }
  },
  requiredCredits: 2,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 2) {
        return {
          success: false,
          result: "Insufficient credits",
          message: "Insufficient credits to generate a product video. You need at least 2 credits."
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
          result: "No image provided",
          message: "No product image URL provided. Please provide an image URL or attach an image."
        };
      }

      // Validate duration
      const duration = params.duration || 30;
      if (duration < 15 || duration > 60) {
        return {
          success: false,
          result: "Invalid duration",
          message: "Video duration must be between 15 and 60 seconds."
        };
      }

      // Insert job record in the database
      const { data: jobData, error: jobError } = await supabase
        .from('video_generation_jobs')
        .insert({
          prompt: `Product Video: ${params.productName}`,
          source_image_url: imageUrl,
          duration: duration.toString(),
          aspect_ratio: "16:9",
          status: 'in_queue',
          user_id: context.userId,
          settings: {
            productName: params.productName,
            productDescription: params.productDescription,
            imageUrl: imageUrl,
            videoStyle: params.videoStyle || "professional",
            duration: duration,
            highlightFeatures: params.highlightFeatures !== false,
            type: "product_video"
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call the edge function to start the generation
      const response = await supabase.functions.invoke('generate-product-video', {
        body: {
          job_id: jobData.id,
          product_name: params.productName,
          product_description: params.productDescription,
          image_url: imageUrl,
          video_style: params.videoStyle || "professional",
          duration: duration,
          highlight_features: params.highlightFeatures !== false
        },
      });

      if (response.error) throw new Error(response.error.message);

      return {
        success: true,
        result: "Video generation started",
        message: "✅ Product video generation started successfully! You'll be notified when it's ready. The process typically takes 3-5 minutes.",
        data: {
          jobId: jobData.id,
          status: "in_queue"
        }
      };
    } catch (error) {
      console.error("Error in product-video tool:", error);
      return {
        success: false,
        result: error instanceof Error ? error.message : "Unknown error",
        message: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred"
      };
    }
  }
};
