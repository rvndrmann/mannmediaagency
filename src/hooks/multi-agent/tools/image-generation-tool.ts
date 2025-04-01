
// src/hooks/multi-agent/tools/image-generation-tool.ts
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolContext, ToolExecutionResult, CommandExecutionState } from "../types";
import { Command } from "@/types/message";

interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  model?: string;
  image_format?: string;
  image_name?: string;
}

/**
 * Tool for generating images using AI
 */
export const imageGenerationTool = {
  name: "generate_image",
  description: "Generate an image using AI with a detailed prompt. You can specify the image dimensions, model, and format.",
  version: "1.0",
  requiredCredits: 1,
  parameters: [
    {
      name: "prompt",
      type: "string",
      description: "A detailed description of the image to generate",
      required: true
    },
    {
      name: "negative_prompt",
      type: "string",
      description: "A negative prompt to avoid certain elements in the image",
      required: false
    },
    {
      name: "width",
      type: "number",
      description: "The width of the image in pixels (e.g., 512, 768, 1024)",
      required: false
    },
    {
      name: "height",
      type: "number",
      description: "The height of the image in pixels (e.g., 512, 768, 1024)",
      required: false
    },
    {
      name: "model",
      type: "string",
      description: "The AI model to use for image generation (e.g., 'sdxl', 'stable-diffusion-v1-5')",
      required: false
    },
    {
      name: "image_format",
      type: "string",
      description: "The format of the generated image (e.g., 'png', 'jpeg')",
      required: false
    },
    {
      name: "image_name",
      type: "string",
      description: "The name of the image file (optional)",
      required: false
    }
  ],
  async execute(command: Command, context: ToolContext): Promise<ToolExecutionResult> {
    try {
      // Extract parameters
      const params: ImageGenerationParams = {
        prompt: command.parameters?.prompt || "",
        negative_prompt: command.parameters?.negative_prompt,
        width: command.parameters?.width,
        height: command.parameters?.height,
        model: command.parameters?.model,
        image_format: command.parameters?.image_format,
        image_name: command.parameters?.image_name
      };

      // Validate required parameters
      if (!params.prompt) {
        return {
          success: false,
          message: "Image description is required",
          state: CommandExecutionState.FAILED
        };
      }

      // Generate a unique image name if not provided
      const imageName = params.image_name || `image-${uuidv4()}`;

      // Call the image generation function
      const result = await generateImage(
        params.prompt,
        params.negative_prompt || "",
        params.width || 512,
        params.height || 512,
        params.model || "sdxl",
        params.image_format || "png",
        imageName,
        context.userId
      );

      if (!result.success) {
        return {
          success: false,
          message: result.error || "Failed to generate image",
          state: CommandExecutionState.FAILED
        };
      }

      return {
        success: true,
        message: `Image generated successfully. Image URL: ${result.imageUrl}`,
        data: {
          imageUrl: result.imageUrl,
          prompt: params.prompt
        },
        state: CommandExecutionState.COMPLETED
      };
    } catch (error) {
      console.error("Error in image generation tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        state: CommandExecutionState.FAILED
      };
    }
  }
};

/**
 * Generate an image using the AI image generation service
 */
async function generateImage(
  prompt: string,
  negative_prompt: string,
  width: number,
  height: number,
  model: string,
  image_format: string,
  image_name: string,
  userId: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // Call the image generation edge function
    const { data, error } = await supabase.functions.invoke("ai-image-generation", {
      body: {
        prompt,
        negative_prompt,
        width,
        height,
        model,
        image_format,
        image_name,
        userId
      }
    });

    if (error) {
      console.error("Error calling image generation:", error);
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.success || !data.imageUrl) {
      return {
        success: false,
        error: data.error || "No image was generated"
      };
    }

    return {
      success: true,
      imageUrl: data.imageUrl
    };
  } catch (error) {
    console.error("Error in generateImage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in image generation"
    };
  }
}
