
import { CommandExecutionState, ToolContext, ToolExecutionResult } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface ProductShotV2Params {
  source_image_url: string;
  prompt: string;
  style_preset?: string;
  background?: string;
  placement?: string;
  aspect_ratio?: string;
  scene_description?: string;
}

export const productShotV2Tool = {
  name: "product_shot_v2",
  description: "Generate product shots with various backgrounds and styles using AI - Version 2",
  version: "2.0",
  requiredCredits: 2,
  parameters: {
    type: "object",
    properties: {
      source_image_url: {
        type: "string",
        description: "URL of the product image to enhance"
      },
      prompt: {
        type: "string",
        description: "Description of the desired scene or context"
      },
      style_preset: {
        type: "string",
        description: "Style preset to use",
        enum: ["product", "lifestyle", "elegant", "minimalist", "vibrant"]
      },
      background: {
        type: "string",
        description: "Background style or color",
        enum: ["transparent", "white", "gradient", "contextual"]
      },
      placement: {
        type: "string",
        description: "How to place the product in the scene",
        enum: ["center", "original", "scene_integrated", "rule_of_thirds"]
      },
      aspect_ratio: {
        type: "string",
        description: "Aspect ratio of the output image",
        enum: ["1:1", "16:9", "9:16", "4:3", "3:4"]
      },
      scene_description: {
        type: "string",
        description: "Detailed description of the scene where the product should be placed"
      }
    },
    required: ["source_image_url", "prompt"]
  },
  execute: executeProductShotV2Tool
};

export async function executeProductShotV2Tool(
  parameters: ProductShotV2Params,
  context: ToolContext
): Promise<ToolExecutionResult> {
  try {
    // Validate required parameters
    if (!parameters.source_image_url) {
      return {
        success: false,
        message: "Source image URL is required",
        error: "Source image URL is required",
        state: CommandExecutionState.FAILED
      };
    }
    
    if (!parameters.prompt) {
      return {
        success: false,
        message: "Prompt is required",
        error: "Prompt is required",
        state: CommandExecutionState.FAILED
      };
    }
    
    // Set default values for optional parameters
    const style = parameters.style_preset || "product";
    const background = parameters.background || "transparent";
    const placement = parameters.placement || "original";
    const aspectRatio = parameters.aspect_ratio || "1:1";
    
    // Calculate dimensions based on aspect ratio
    let width = 1024;
    let height = 1024;
    
    if (aspectRatio === "16:9") {
      width = 1600;
      height = 900;
    } else if (aspectRatio === "9:16") {
      width = 900;
      height = 1600;
    } else if (aspectRatio === "4:3") {
      width = 1200;
      height = 900;
    } else if (aspectRatio === "3:4") {
      width = 900;
      height = 1200;
    }
    
    // Call the Supabase Edge Function for product shot generation
    try {
      const { data, error } = await supabase.functions.invoke('product-shot-v2', {
        body: {
          sourceImageUrl: parameters.source_image_url,
          prompt: parameters.prompt,
          stylePreset: style,
          background: background,
          placement: placement,
          width: width,
          height: height,
          aspectRatio: aspectRatio,
          sceneDescription: parameters.scene_description || parameters.prompt
        }
      });
      
      if (error) {
        console.error("Error calling product-shot-v2 edge function:", error);
        return {
          success: false,
          message: error.message || "Failed to generate product shot",
          error: error,
          state: CommandExecutionState.FAILED
        };
      }
      
      // If the edge function returns an error message
      if (!data.success) {
        return {
          success: false,
          message: data.message || "Failed to generate product shot",
          error: data.error || "Unknown error",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Track usage in database if userId is available
      if (context.userId) {
        await trackToolUsage(context.userId, "product_shot_v2", 2);
      }
      
      // Return success result
      return {
        success: true,
        message: "Product shot generated successfully",
        data: {
          result_url: data.resultUrl,
          prompt: parameters.prompt,
          style: style,
          aspect_ratio: aspectRatio
        },
        usage: {
          creditsUsed: 2
        },
        state: CommandExecutionState.COMPLETED
      };
    } catch (error) {
      console.error("Error in product shot generation:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error in product shot generation",
        error: error,
        state: CommandExecutionState.FAILED
      };
    }
  } catch (error) {
    console.error("Error executing product shot v2 tool:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error executing product shot v2 tool",
      error: error,
      state: CommandExecutionState.FAILED
    };
  }
}

// Helper function to track tool usage
async function trackToolUsage(userId: string, toolName: string, creditsUsed: number): Promise<void> {
  try {
    await supabase.from('tool_usage').insert([
      {
        user_id: userId,
        tool_name: toolName,
        credits_used: creditsUsed,
        used_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error("Error tracking tool usage:", error);
    // Don't fail the main operation if tracking fails
  }
}
