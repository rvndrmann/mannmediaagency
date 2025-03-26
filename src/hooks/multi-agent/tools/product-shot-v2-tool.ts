import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolContext, ToolResult } from "../types";
import { Command } from "@/types/message";

interface ProductShotParams {
  prompt: string;
  style?: string;
  background?: string;
  angle?: string;
  lighting?: string;
  resolution?: string;
  format?: string;
}

interface ProductShotResponse {
  success: boolean;
  resultUrl?: string;
  error?: string;
}

/**
 * Tool for generating product shots using AI
 */
export const productShotV2Tool = {
  name: "product_shot_v2",
  description: "Generate professional product photography using AI",
  version: "2.0",
  
  parameters: [
    {
      name: "prompt",
      type: "string",
      description: "Description of the product to generate",
      required: true
    },
    {
      name: "style",
      type: "string",
      description: "Visual style (e.g., minimalist, luxury, vintage)",
      required: false
    },
    {
      name: "background",
      type: "string",
      description: "Background setting (e.g., white, gradient, studio)",
      required: false
    },
    {
      name: "angle",
      type: "string",
      description: "Camera angle (e.g., front, 45-degree, top-down)",
      required: false
    },
    {
      name: "lighting",
      type: "string",
      description: "Lighting setup (e.g., soft, dramatic, natural)",
      required: false
    },
    {
      name: "resolution",
      type: "string",
      description: "Image resolution (e.g., 1024x1024, 1024x1792)",
      required: false
    },
    {
      name: "format",
      type: "string",
      description: "Image format (e.g., square, portrait, landscape)",
      required: false
    }
  ],
  
  async execute(command: Command, context: ToolContext): Promise<ToolResult> {
    try {
      // Extract parameters
      const params: ProductShotParams = {
        prompt: command.args.prompt || "",
        style: command.args.style,
        background: command.args.background,
        angle: command.args.angle,
        lighting: command.args.lighting,
        resolution: command.args.resolution,
        format: command.args.format
      };
      
      // Validate required parameters
      if (!params.prompt) {
        return {
          success: false,
          message: "Product description is required"
        };
      }
      
      // Build the full prompt
      let fullPrompt = `Product: ${params.prompt}`;
      
      if (params.style) {
        fullPrompt += `\nStyle: ${params.style}`;
      }
      
      if (params.background) {
        fullPrompt += `\nBackground: ${params.background}`;
      }
      
      if (params.angle) {
        fullPrompt += `\nAngle: ${params.angle}`;
      }
      
      if (params.lighting) {
        fullPrompt += `\nLighting: ${params.lighting}`;
      }
      
      // Generate the product shot
      const result = await generateProductShot(
        fullPrompt,
        params.resolution || "1024x1024",
        params.format || "square",
        context.userId
      );
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || "Failed to generate product shot"
        };
      }
      
      return {
        success: true,
        message: `Product shot generated successfully. Image URL: ${result.resultUrl}`,
        data: {
          imageUrl: result.resultUrl,
          prompt: params.prompt
        }
      };
      
    } catch (error) {
      console.error("Error in product shot tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
};

/**
 * Generate a product shot using the AI image generation service
 */
async function generateProductShot(
  prompt: string,
  resolution: string = "1024x1024",
  format: string = "square",
  userId: string
): Promise<ProductShotResponse> {
  try {
    // Call the image generation edge function
    const { data, error } = await supabase.functions.invoke("ai-image-generation", {
      body: {
        prompt,
        resolution,
        format,
        model: "product-shot-v2",
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
      resultUrl: data.imageUrl
    };
    
  } catch (error) {
    console.error("Error in generateProductShot:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in image generation"
    };
  }
}
