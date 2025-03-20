
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Tool, ToolResult } from "../types";
import { toast } from "sonner";

export interface ProductShotV1ToolParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  requestId?: string;
}

export const productShotV1Tool: Tool<ProductShotV1ToolParams> = {
  name: "product_shot_v1",
  description: "Generate a product image based on a description",
  parameters: {
    prompt: {
      type: "string",
      description: "Detailed description of the product to visualize",
      required: true,
    },
    negativePrompt: {
      type: "string",
      description: "Elements to avoid in the generated image",
      required: false,
    },
    aspectRatio: {
      type: "string",
      description: "Aspect ratio for the image (e.g., '1:1', '16:9', '4:3')",
      required: false,
    },
    requestId: {
      type: "string",
      description: "Optional request ID for tracking the generation",
      required: false,
    },
  },
  execute: async ({ prompt, negativePrompt, aspectRatio, requestId }) => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          content: "⚠️ You need to be logged in to generate product images.",
          metadata: { error: "Authentication required" }
        };
      }

      // Check if user has enough credits
      const { data: creditCheck, error: creditError } = await supabase.rpc(
        "safely_decrease_chat_credits",
        { credit_amount: 1 }
      );

      if (creditError || creditCheck === false) {
        return {
          content: "⚠️ You don't have enough credits to generate a product image. Please purchase more credits.",
          metadata: { error: "Insufficient credits" }
        };
      }

      // Generate a request ID if not provided
      const generationId = requestId || uuidv4();

      // Create a record in the database
      const { error: insertError } = await supabase
        .from("image_generation_jobs")
        .insert({
          user_id: session.user.id,
          prompt: prompt,
          negative_prompt: negativePrompt || "",
          aspect_ratio: aspectRatio || "1:1",
          status: "in_queue",
          request_id: generationId,
        });

      if (insertError) {
        console.error("Error creating image generation job:", insertError);
        return {
          content: "⚠️ Failed to initiate image generation. Please try again.",
          metadata: { error: insertError.message }
        };
      }

      // Call the edge function to start the generation process
      const { error: functionError } = await supabase.functions.invoke(
        "generate-product-image",
        {
          body: {
            prompt,
            negative_prompt: negativePrompt || "",
            aspect_ratio: aspectRatio || "1:1",
            request_id: generationId,
          },
        }
      );

      if (functionError) {
        console.error("Error calling image generation function:", functionError);
        return {
          content: "⚠️ Failed to start image generation process. Please try again.",
          metadata: { error: functionError.message }
        };
      }

      // Return a message indicating the generation has started
      return {
        content: `Initializing product image generation...`,
        metadata: { requestId: generationId },
      };
    } catch (error: any) {
      console.error("Error in product shot v1 tool:", error);
      return {
        content: "⚠️ An error occurred while generating the product image. Please try again.",
        metadata: { error: error.message }
      };
    }
  },
};
