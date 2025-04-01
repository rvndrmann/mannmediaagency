
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, CommandExecutionState } from "../tools/types";

export const imageToVideoTool: ToolDefinition = {
  name: "image_to_video",
  description: "Convert an image into a short video clip with animated effects",
  parameters: {
    type: "object",
    properties: {
      imageUrl: {
        type: "string",
        description: "URL of the image to convert to video"
      },
      duration: {
        type: "number",
        description: "Duration of the video in seconds (1-10)",
        default: 5
      },
      style: {
        type: "string",
        description: "Style of animation to apply",
        enum: ["zoom", "pan", "fade", "3d", "particles", "none"],
        default: "zoom"
      }
    },
    required: ["imageUrl"]
  },
  
  async execute(params, context) {
    try {
      const { imageUrl, duration = 5, style = "zoom" } = params;
      
      if (!imageUrl) {
        return {
          success: false,
          message: "Image URL is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Validate duration
      if (duration < 1 || duration > 10) {
        return {
          success: false,
          message: "Duration must be between 1 and 10 seconds",
          state: CommandExecutionState.ERROR
        };
      }
      
      // Handle authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: "Authentication required",
          state: CommandExecutionState.ERROR
        };
      }
      
      // Check if user has sufficient credits
      // This is a placeholder - in a real implementation you'd check a user_credits table
      const userHasCredits = true;
      if (!userHasCredits) {
        return {
          success: false,
          message: "Insufficient credits to perform this operation",
          state: CommandExecutionState.FAILED
        };
      }
      
      try {
        // For demo, check if a video with this image already exists
        // Use RPC call instead of direct table access
        const { data: existingVideos, error: lookupError } = await supabase
          .rpc('get_video_generation_by_source', {
            p_source_image_url: imageUrl
          });
        
        if (lookupError) throw lookupError;
        
        if (existingVideos && existingVideos.length > 0) {
          const video = existingVideos[0];
          
          if (video.status === 'completed' && video.result_url) {
            return {
              success: true,
              message: "Video was already generated for this image",
              data: {
                videoUrl: video.result_url,
                duration: video.duration,
                style: video.style
              },
              state: CommandExecutionState.COMPLETED
            };
          } else if (video.status === 'failed') {
            return {
              success: false,
              message: "Previous attempt to generate video failed",
              state: CommandExecutionState.ERROR
            };
          } else {
            // Still processing
            return {
              success: true,
              message: "Video generation is still in progress",
              data: {
                jobId: video.id,
                status: "processing"
              },
              state: CommandExecutionState.PROCESSING
            };
          }
        }
        
        // Create a new video generation job
        const { data: newJob, error } = await supabase
          .rpc('create_video_generation_job', {
            p_source_image_url: imageUrl,
            p_user_id: user.id,
            p_duration: duration.toString(),
            p_style: style
          });
        
        if (error) {
          throw error;
        }
        
        // For demo, simulate starting the job
        return {
          success: true,
          message: "Video generation started",
          data: {
            jobId: newJob.id,
            status: "pending",
            estimatedTime: `${Math.round(duration * 1.5)} seconds`
          },
          state: CommandExecutionState.PROCESSING
        };
      } catch (dbError) {
        console.error("Database error:", dbError);
        return {
          success: false,
          message: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
          state: CommandExecutionState.ERROR
        };
      }
    } catch (error) {
      console.error("Image to video conversion error:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        state: CommandExecutionState.ERROR
      };
    }
  }
};
