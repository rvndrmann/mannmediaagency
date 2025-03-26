
import { ToolDefinition, ToolResult, ToolContext } from "../types";
import { Command } from "@/types/message";

export const productShotV1Tool: ToolDefinition = {
  name: "product-shot-v1",
  description: "Generate stunning product photos by transforming your product images with AI",
  version: "1.0.0",
  requiredCredits: 5,
  parameters: [
    {
      name: "productImage",
      type: "string",
      description: "URL of the product image to transform",
      required: true,
      prompt: "Upload or provide a URL to your product image"
    },
    {
      name: "prompt",
      type: "string",
      description: "Detailed description of the desired scene for the product",
      required: true
    },
    {
      name: "imageSize",
      type: "string",
      description: "Size of the generated image (512x512, 768x768, 1024x1024)",
      required: false
    },
    {
      name: "inferenceSteps",
      type: "number",
      description: "Number of inference steps (10-50, higher means better quality but slower)",
      required: false
    },
    {
      name: "guidanceScale",
      type: "number",
      description: "Guidance scale (1-20, higher means more adherence to prompt)",
      required: false
    },
    {
      name: "outputFormat",
      type: "string",
      description: "Output format (PNG, JPEG, WEBP)",
      required: false
    }
  ],

  async execute(command: Command, context: ToolContext): Promise<ToolResult> {
    try {
      // Extract parameters from the command
      const productImage = command.parameters?.productImage as string;
      
      if (!productImage) {
        return {
          success: false,
          message: "Product image is required"
        };
      }

      // Handle both URL and direct attachments
      let imageUrl = productImage;
      if (context.attachments && context.attachments.length > 0) {
        const imageAttachment = context.attachments.find(att => 
          att.type.startsWith('image/') || att.contentType?.startsWith('image/')
        );
        if (imageAttachment) {
          imageUrl = imageAttachment.url;
        }
      }

      const prompt = command.parameters?.prompt as string;
      if (!prompt) {
        return {
          success: false,
          message: "Prompt is required to describe the scene for your product"
        };
      }

      // Optional parameters with defaults
      const imageSize = command.parameters?.imageSize as string || "768x768";
      const inferenceSteps = Number(command.parameters?.inferenceSteps) || 30;
      const guidanceScale = Number(command.parameters?.guidanceScale) || 7.5;
      const outputFormat = command.parameters?.outputFormat as string || "PNG";

      // Call the Supabase function to generate the product shot
      const { data, error } = await context.supabase.functions.invoke("product-shot-v1", {
        body: {
          prompt: prompt,
          sourceImageUrl: imageUrl,
          settings: {
            size: imageSize,
            inferenceSteps: inferenceSteps,
            guidanceScale: guidanceScale,
            outputFormat: outputFormat.toUpperCase()
          }
        }
      });

      if (error) {
        console.error("Error generating product shot:", error);
        return {
          success: false,
          message: `Error generating product shot: ${error.message || "Unknown error"}`
        };
      }

      return {
        success: true,
        message: "Product shot generated successfully",
        data: {
          imageUrl: data.imageUrl,
          prompt: prompt,
          settings: {
            size: imageSize,
            inferenceSteps: inferenceSteps,
            guidanceScale: guidanceScale,
            outputFormat: outputFormat
          }
        }
      };
    } catch (error) {
      console.error("Error in product-shot-v1 tool:", error);
      return {
        success: false,
        message: `Error executing product-shot-v1 tool: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
};
