
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";

export const productShotV2Tool: ToolDefinition = {
  name: "product_shot_v2",
  description: "Generate an enhanced product photo with advanced customization options",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Detailed description of the product photo to generate"
      },
      image_url: {
        type: "string",
        description: "URL of the product image to use as a reference"
      },
      style: {
        type: "string",
        description: "Visual style for the output (e.g., 'modern', 'vintage', 'minimalist')"
      },
      aspect_ratio: {
        type: "string",
        description: "Aspect ratio of the output image (e.g., '1:1', '16:9', '4:5')",
        enum: ["1:1", "16:9", "4:5", "3:2"]
      },
      background: {
        type: "string",
        description: "Background description (e.g., 'gradient blue to white', 'studio lighting', 'beach scene')"
      }
    },
    required: ["prompt", "image_url"]
  },
  requiredCredits: 2,
  metadata: {
    category: "image",
    displayName: "Pro Product Shot",
    icon: "ImagePlus"
  },
  execute: async (params: {
    prompt: string;
    image_url: string;
    style?: string;
    aspect_ratio?: string;
    background?: string;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Verify the tool is available and user has credits
      if (!context.toolAvailable) {
        return {
          success: false,
          message: "Pro product shot generation is not available in your current plan",
          error: "Tool unavailable"
        };
      }
      
      if (context.userCredits !== undefined && context.userCredits < 2) {
        return {
          success: false,
          message: `Insufficient credits for Pro product shot. Required: 2, Available: ${context.userCredits}`,
          error: "Insufficient credits"
        };
      }
      
      // Generate a unique id for this job
      const jobId = uuidv4();
      console.log(`Starting enhanced product shot generation with ID: ${jobId}`);
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Starting enhanced product shot generation: ${params.prompt}`, "tool_start");
      }
      
      // Call the edge function to generate the enhanced product shot
      const { data, error } = await supabase.functions.invoke("product-shot-v2-generator", {
        body: {
          prompt: params.prompt,
          image_url: params.image_url,
          style: params.style || "modern",
          aspect_ratio: params.aspect_ratio || "1:1",
          background: params.background || "gradient white to light gray",
          job_id: jobId,
          user_id: context.userId
        }
      });
      
      if (error) {
        console.error("Error generating enhanced product shot:", error);
        return {
          success: false,
          message: `Error generating enhanced product shot: ${error.message}`,
          error: error.message
        };
      }
      
      // Check if we received a valid result
      if (!data || !data.request_id) {
        console.error("Invalid response from enhanced product shot generator:", data);
        return {
          success: false,
          message: "Failed to start enhanced product shot generation",
          error: "Invalid response from service"
        };
      }
      
      // Now we poll for the result
      let result = null;
      let attempts = 0;
      const maxAttempts = 40; // ~6.5 minutes (10 seconds * 40)
      
      while (!result && attempts < maxAttempts) {
        attempts++;
        
        // Wait 10 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if the job is complete
        const { data: statusData, error: statusError } = await supabase.functions.invoke("product-shot-status", {
          body: {
            request_id: data.request_id,
            job_id: jobId,
            version: "v2"
          }
        });
        
        if (statusError) {
          console.error("Error checking enhanced product shot status:", statusError);
          continue;
        }
        
        // If the job is complete, get the result
        if (statusData && statusData.status === "completed" && statusData.result_url) {
          result = statusData;
        }
      }
      
      // If we reached max attempts, consider it timed out
      if (!result) {
        return {
          success: false,
          message: "Enhanced product shot generation timed out",
          error: "Generation timeout"
        };
      }
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Completed enhanced product shot generation in ${attempts * 10} seconds`, "tool_complete");
      }
      
      // Save to the user's history if requested
      if (context.userId) {
        try {
          await supabase.from("product_shot_history").insert({
            user_id: context.userId,
            source_image_url: params.image_url,
            result_url: result.result_url,
            scene_description: params.prompt,
            settings: {
              style: params.style || "modern",
              aspect_ratio: params.aspect_ratio || "1:1",
              background: params.background || "gradient white to light gray"
            },
            visibility: "private"
          });
        } catch (saveError) {
          console.error("Error saving enhanced product shot to history:", saveError);
          // Continue anyway, this is not critical
        }
      }
      
      // Return the successful result
      return {
        success: true,
        message: "Enhanced product shot generated successfully",
        data: {
          result_url: result.result_url,
          prompt: params.prompt,
          style: params.style || "modern",
          aspect_ratio: params.aspect_ratio || "1:1"
        },
        usage: {
          creditsUsed: 2
        }
      };
    } catch (error: any) {
      console.error("Error in enhanced product shot tool:", error);
      
      return {
        success: false,
        message: `Enhanced product shot generation error: ${error.message}`,
        error: error.message
      };
    }
  }
};
