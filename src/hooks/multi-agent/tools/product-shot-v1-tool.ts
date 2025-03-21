
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "../types";

export const productShotV1Tool: ToolDefinition = {
  name: "product-shot-v1",
  description: "Generate a product image from a reference photo",
  parameters: {
    prompt: {
      type: "string",
      description: "Description of the product image to generate",
      required: true
    },
    imageUrl: {
      type: "string",
      description: "URL of the reference product image",
      required: false
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
        .from('image_generation_jobs')
        .insert({
          user_id: context.userId,
          prompt: params.prompt,
          status: 'pending',
          settings: {
            imageUrl: imageUrl
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
      const response = await supabase.functions.invoke('generate-product-image', {
        body: {
          generation_id: generationData.id,
          prompt: params.prompt,
          image_url: imageUrl
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
        message: "Product image generation started. This will take a moment.",
        data: {
          generationId: generationData.id,
          status: "pending"
        }
      };
    } catch (error) {
      console.error("Error in product-shot-v1 tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      };
    }
  }
};
