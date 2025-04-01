
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";

export const productShotV1Tool: ToolDefinition = {
  name: "product_shot_v1",
  description: "Generate a professional product photo with customizable settings",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Description of the product photo to generate"
      },
      image_url: {
        type: "string",
        description: "URL of the product image to use as a reference"
      },
      bg_type: {
        type: "string",
        description: "Background type ('gradient', 'studio', 'lifestyle')",
        enum: ["gradient", "studio", "lifestyle"]
      },
      bg_color: {
        type: "string",
        description: "Background color (for gradient background)"
      },
      scene: {
        type: "string",
        description: "Scene description (for lifestyle background)"
      }
    },
    required: ["prompt"]
  },
  requiredCredits: 1,
  metadata: {
    category: "image",
    displayName: "Product Shot",
    icon: "Image"
  },
  execute: async (params: {
    prompt: string;
    image_url?: string;
    bg_type?: string;
    bg_color?: string;
    scene?: string;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Verify the tool is available
      if (!context.toolAvailable) {
        return {
          success: false,
          message: "Product shot generation is not available in your current plan",
          error: "Tool unavailable"
        };
      }
      
      // Check if there's an attachment
      let imageUrl = params.image_url;
      
      // Generate a unique id for this job
      const jobId = uuidv4();
      console.log(`Starting product shot generation with ID: ${jobId}`);
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Starting product shot generation: ${params.prompt}`, "tool_start");
      }
      
      // Call the edge function to generate the product shot
      const { data, error } = await supabase.functions.invoke("product-shot-generator", {
        body: {
          prompt: params.prompt,
          image_url: imageUrl,
          bg_type: params.bg_type || "gradient",
          bg_color: params.bg_color || "#FFFFFF",
          scene: params.scene || "",
          job_id: jobId,
          user_id: context.userId
        }
      });
      
      if (error) {
        console.error("Error generating product shot:", error);
        return {
          success: false,
          message: `Error generating product shot: ${error.message}`,
          error: error.message
        };
      }
      
      // Check if we received a valid result
      if (!data || !data.request_id) {
        console.error("Invalid response from product shot generator:", data);
        return {
          success: false,
          message: "Failed to start product shot generation",
          error: "Invalid response from service"
        };
      }
      
      // Now we poll for the result
      let result = null;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes (10 seconds * 30)
      
      while (!result && attempts < maxAttempts) {
        attempts++;
        
        // Wait 10 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if the job is complete
        const { data: statusData, error: statusError } = await supabase.functions.invoke("product-shot-status", {
          body: {
            request_id: data.request_id,
            job_id: jobId
          }
        });
        
        if (statusError) {
          console.error("Error checking product shot status:", statusError);
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
          message: "Product shot generation timed out",
          error: "Generation timeout"
        };
      }
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Completed product shot generation in ${attempts * 10} seconds`, "tool_complete");
      }
      
      // Save to the user's history if requested
      if (context.userId) {
        try {
          await supabase.from("product_shot_history").insert({
            user_id: context.userId,
            source_image_url: imageUrl || "",
            result_url: result.result_url,
            scene_description: params.prompt,
            settings: {
              bg_type: params.bg_type || "gradient",
              bg_color: params.bg_color || "#FFFFFF",
              scene: params.scene || ""
            }
          });
        } catch (saveError) {
          console.error("Error saving product shot to history:", saveError);
          // Continue anyway, this is not critical
        }
      }
      
      // Return the successful result
      return {
        success: true,
        message: "Product shot generated successfully",
        data: {
          result_url: result.result_url,
          prompt: params.prompt
        },
        usage: {
          creditsUsed: 1
        }
      };
    } catch (error: any) {
      console.error("Error in product shot tool:", error);
      
      return {
        success: false,
        message: `Product shot generation error: ${error.message}`,
        error: error.message
      };
    }
  }
};
