
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";

export const imageToVideoTool: ToolDefinition = {
  name: "image_to_video",
  description: "Convert a static image into a short video with motion effects",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "URL of the image to animate"
      },
      duration: {
        type: "string",
        description: "Duration of the video in seconds (2-10)",
        enum: ["2", "3", "4", "5", "6", "8", "10"]
      },
      motion: {
        type: "string",
        description: "Type of motion effect to apply",
        enum: ["zoom_in", "zoom_out", "pan_left", "pan_right", "3d_parallax", "subtle"]
      },
      prompt: {
        type: "string",
        description: "Optional text description to guide the animation"
      }
    },
    required: ["image_url"]
  },
  requiredCredits: 3,
  metadata: {
    category: "video",
    displayName: "Image to Video",
    icon: "Video"
  },
  execute: async (params: {
    image_url: string;
    duration?: string;
    motion?: string;
    prompt?: string;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Verify the tool is available
      if (!context.toolAvailable) {
        return {
          success: false,
          message: "Image to video conversion is not available in your current plan",
          error: "Tool unavailable"
        };
      }
      
      // Verify user has enough credits
      if (context.userCredits !== undefined && context.userCredits < 3) {
        return {
          success: false,
          message: `Insufficient credits for image to video conversion. Required: 3, Available: ${context.userCredits}`,
          error: "Insufficient credits"
        };
      }
      
      // Generate a unique id for this job
      const jobId = uuidv4();
      console.log(`Starting image to video conversion with ID: ${jobId}`);
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Starting image to video conversion for: ${params.image_url.substring(0, 30)}...`, "tool_start");
      }
      
      // Call the edge function to start the video generation
      const { data, error } = await supabase.functions.invoke("image-to-video", {
        body: {
          image_url: params.image_url,
          duration: params.duration || "5",
          motion: params.motion || "subtle",
          prompt: params.prompt || "",
          job_id: jobId,
          user_id: context.userId
        }
      });
      
      if (error) {
        console.error("Error starting image to video conversion:", error);
        return {
          success: false,
          message: `Error starting image to video conversion: ${error.message}`,
          error: error.message
        };
      }
      
      // Check if we received a valid result
      if (!data || !data.request_id) {
        console.error("Invalid response from image to video generator:", data);
        return {
          success: false,
          message: "Failed to start image to video conversion",
          error: "Invalid response from service"
        };
      }
      
      // Now we poll for the result
      let result = null;
      let attempts = 0;
      const maxAttempts = 60; // 10 minutes (10 seconds * 60)
      
      while (!result && attempts < maxAttempts) {
        attempts++;
        
        // Wait 10 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if the job is complete
        const { data: statusData, error: statusError } = await supabase.functions.invoke("video-generation-status", {
          body: {
            request_id: data.request_id,
            job_id: jobId
          }
        });
        
        if (statusError) {
          console.error("Error checking video generation status:", statusError);
          continue;
        }
        
        // If the job is complete, get the result
        if (statusData && statusData.status === "completed" && statusData.result_url) {
          result = statusData;
        } else if (statusData && statusData.status === "failed") {
          return {
            success: false,
            message: `Image to video conversion failed: ${statusData.error || "Unknown error"}`,
            error: statusData.error || "Unknown error"
          };
        }
      }
      
      // If we reached max attempts, consider it timed out
      if (!result) {
        return {
          success: false,
          message: "Image to video conversion timed out",
          error: "Generation timeout"
        };
      }
      
      // Calculate actual time taken
      const processingTime = attempts * 10;
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Completed image to video conversion in ${processingTime} seconds`, "tool_complete");
      }
      
      // Save to the user's history if user_id is available
      if (context.userId) {
        try {
          await supabase.from("video_generation_jobs").insert({
            user_id: context.userId,
            source_image_url: params.image_url,
            prompt: params.prompt || "",
            result_url: result.result_url,
            duration: params.duration || "5",
            status: "completed",
            request_id: data.request_id,
            settings: {
              motion: params.motion || "subtle"
            }
          });
        } catch (saveError) {
          console.error("Error saving video to history:", saveError);
          // Continue anyway, this is not critical
        }
      }
      
      // Return the successful result
      return {
        success: true,
        message: "Image converted to video successfully",
        data: {
          result_url: result.result_url,
          thumbnail_url: result.thumbnail_url || result.result_url,
          duration: params.duration || "5",
          processing_time: processingTime
        },
        usage: {
          creditsUsed: 3
        }
      };
    } catch (error: any) {
      console.error("Error in image to video tool:", error);
      
      return {
        success: false,
        message: `Image to video conversion error: ${error.message}`,
        error: error.message
      };
    }
  }
};
