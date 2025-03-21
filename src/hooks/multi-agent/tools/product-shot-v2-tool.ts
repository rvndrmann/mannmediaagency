
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "../types";

export const productShotV2Tool: ToolDefinition = {
  name: "product-shot-v2",
  description: "Generate a high-quality product image from a reference photo with advanced AI",
  parameters: {
    prompt: {
      type: "string",
      description: "Description of the product image to generate"
    },
    imageUrl: {
      type: "string",
      description: "URL of the reference product image"
    },
    aspectRatio: {
      type: "string",
      description: "Aspect ratio of the output image",
      enum: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      default: "1:1"
    },
    optimize: {
      type: "boolean",
      description: "Whether to automatically optimize the prompt for better results",
      default: true
    }
  },
  requiredCredits: 1,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 1) {
        return {
          success: false,
          message: "Insufficient credits to generate a product image. You need at least 1 credit."
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

      // Begin generating the product shot
      const { data: generationData, error: generationError } = await supabase
        .from('product_images')
        .insert({
          user_id: context.userId,
          prompt: params.prompt,
          source_image_url: imageUrl,
          status: 'pending',
          settings: {
            optimize_description: params.optimize !== false,
            aspectRatio: params.aspectRatio || "1:1"
          }
        })
        .select()
        .single();

      if (generationError) {
        console.error("DB error creating generation:", generationError);
        return {
          success: false,
          message: `Failed to start generation: ${generationError.message}`
        };
      }

      // Call the edge function to start the generation
      const response = await supabase.functions.invoke('generate-product-shot', {
        body: {
          generation_id: generationData.id,
          prompt: params.prompt,
          image_url: imageUrl,
          optimize: params.optimize !== false,
          aspect_ratio: params.aspectRatio || "1:1"
        },
      });

      if (response.error) {
        console.error("Edge function error:", response.error);
        return {
          success: false,
          message: `Failed to start generation: ${response.error.message}`
        };
      }

      return {
        success: true,
        message: "Product image generation started. This may take up to a minute.",
        data: {
          generationId: generationData.id,
          status: "pending"
        }
      };
    } catch (error) {
      console.error("Error in product-shot-v2 tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      };
    }
  }
};
