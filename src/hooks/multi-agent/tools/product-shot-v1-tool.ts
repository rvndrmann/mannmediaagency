import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "@/hooks/types";

export const productShotV1Tool: ToolDefinition = {
  name: "product-shot-v1",
  description: "Generate a product image based on a reference image and a prompt",
  parameters: {
    prompt: {
      type: "string",
      description: "Description of the product shot to generate"
    },
    imageUrl: {
      type: "string",
      description: "URL of the source product image"
    },
    imageSize: {
      type: "string",
      description: "Size of the output image",
      enum: ["square", "square_hd", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
      default: "square"
    },
    inferenceSteps: {
      type: "number",
      description: "Number of inference steps",
      default: 5
    },
    guidanceScale: {
      type: "number",
      description: "Guidance scale for image generation",
      default: 5
    },
    outputFormat: {
      type: "string",
      description: "Output format of the image",
      enum: ["png", "jpg"],
      default: "png"
    }
  },
  requiredCredits: 0.2,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      // Check if user has enough credits
      if (context.creditsRemaining < 0.2) {
        return {
          success: false,
          message: "Insufficient credits to generate a product shot. You need at least 0.2 credits."
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

      // Insert a record in the database with correct schema
      const { data: jobData, error: jobError } = await supabase
        .from("image_generation_jobs")
        .insert({
          prompt: params.prompt,
          settings: {
            source_image_url: imageUrl,
            image_size: params.imageSize || "square",
            inference_steps: params.inferenceSteps || 5,
            guidance_scale: params.guidanceScale || 5,
            output_format: params.outputFormat || "png"
          },
          status: "pending",
          user_id: context.userId
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Map the tool parameters to the edge function format
      const requestBody = {
        image_url: imageUrl,
        scene_description: params.prompt,
        optimize_description: true,
        num_results: 1,
        fast: true,
        placement_type: 'automatic',
        sync_mode: false
      };

      // Call the generate-product-shot edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-product-shot",
        {
          body: JSON.stringify(requestBody)
        }
      );

      if (functionError) throw functionError;

      // Update the job record with the request ID
      if (data?.requestId) {
        await supabase
          .from("image_generation_jobs")
          .update({ 
            request_id: data.requestId,
            status: "processing"
          })
          .eq("id", jobData?.id);
      }

      return {
        success: true,
        message: "Product shot generation started successfully. You'll be notified when it's ready.",
        data: {
          jobId: jobData?.id,
          requestId: data?.requestId,
          status: "processing"
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
