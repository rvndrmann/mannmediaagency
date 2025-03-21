
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "../types";

export const productShotV2Tool: ToolDefinition = {
  name: "product-shot-v2",
  description: "Generate professional product shots with advanced scene composition",
  parameters: {
    prompt: {
      type: "string",
      description: "Description of the product and desired result",
      required: true
    },
    imageUrl: {
      type: "string",
      description: "URL of the product image",
      required: true
    },
    sceneType: {
      type: "string",
      description: "Type of scene to place the product in",
      required: true,
      enum: ["studio", "lifestyle", "outdoor", "abstract", "custom"],
      default: "studio"
    },
    sceneDescription: {
      type: "string",
      description: "Detailed description of the scene (for custom scenes)",
      required: false
    }
  },
  requiredCredits: 2,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 2) {
        return {
          success: false,
          message: "Insufficient credits to generate a product shot. You need at least 2 credits."
        };
      }

      // Validate required parameters
      if (!params.prompt) {
        return {
          success: false,
          message: "Missing required parameter: prompt"
        };
      }

      if (!params.imageUrl) {
        // Check if an image was attached
        if (context.attachments && context.attachments.length > 0) {
          const imageAttachment = context.attachments.find(att => att.type === "image");
          if (imageAttachment) {
            params.imageUrl = imageAttachment.url;
          } else {
            return {
              success: false,
              message: "No product image provided. Please provide an image URL or attach an image."
            };
          }
        } else {
          return {
            success: false,
            message: "No product image provided. Please provide an image URL or attach an image."
          };
        }
      }

      // Validate scene type
      const validSceneTypes = ["studio", "lifestyle", "outdoor", "abstract", "custom"];
      const sceneType = validSceneTypes.includes(params.sceneType) ? 
        params.sceneType : "studio";

      // Insert job record
      const { data: jobData, error: jobError } = await supabase
        .from('product_shot_jobs')
        .insert({
          prompt: params.prompt,
          product_image_url: params.imageUrl,
          scene_type: sceneType,
          scene_description: params.sceneDescription || "",
          status: 'in_queue',
          user_id: context.userId,
          version: 2,
          settings: {
            prompt: params.prompt,
            imageUrl: params.imageUrl,
            sceneType: sceneType,
            sceneDescription: params.sceneDescription || ""
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Call edge function to start generation
      const response = await supabase.functions.invoke('generate-product-shot', {
        body: {
          job_id: jobData.id,
          prompt: params.prompt,
          image_url: params.imageUrl,
          scene_type: sceneType,
          scene_description: params.sceneDescription || "",
          version: 2
        },
      });

      if (response.error) throw new Error(response.error.message);

      return {
        success: true,
        message: "Product shot generation started. You'll be notified when it's ready. This version includes improved scene composition and lighting.",
        data: {
          jobId: jobData.id,
          status: "in_queue"
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
