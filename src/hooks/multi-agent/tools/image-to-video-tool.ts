
import { RunnerContext } from "../runner/types";
import { ToolExecutionResult, ToolDefinition, ToolContext } from "../types";

export const imageToVideoTool: ToolDefinition = {
  name: "image_to_video",
  description: "Convert a still image into a short video clip with motion effects",
  requiredCredits: 5,
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "URL of the image to convert to video"
      },
      motion_type: {
        type: "string",
        enum: ["zoom_in", "zoom_out", "pan_left", "pan_right", "ken_burns"],
        description: "Type of motion effect to apply to the image"
      },
      duration_seconds: {
        type: "number",
        description: "Duration of the video in seconds (1-10)",
        minimum: 1,
        maximum: 10
      }
    },
    required: ["image_url"]
  },
  metadata: {
    category: "video",
    displayName: "Image to Video",
    icon: "Video"
  },
  execute: async (params: { 
    image_url: string;
    motion_type?: string;
    duration_seconds?: number;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Default values
      const motion = params.motion_type || "ken_burns";
      const duration = params.duration_seconds || 5;
      
      // Validate parameters
      if (!params.image_url) {
        return {
          success: false,
          message: "Image URL is required",
          error: "Missing required parameter: image_url"
        };
      }
      
      // Call the edge function to convert image to video
      const { data, error } = await context.supabase.functions.invoke('image-to-video', {
        body: {
          imageUrl: params.image_url,
          motionType: motion,
          durationSeconds: duration,
          userId: context.userId
        }
      });
      
      if (error) {
        console.error("Image to video conversion error:", error);
        return {
          success: false,
          message: `Failed to convert image to video: ${error.message}`,
          error: error.message
        };
      }
      
      return {
        success: true,
        message: "Image successfully converted to video",
        data: {
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl,
          duration: data.duration || duration,
          aspectRatio: data.aspectRatio || "16:9"
        },
        usage: {
          creditsUsed: data.creditsUsed || 5
        }
      };
    } catch (error) {
      console.error("Error in image-to-video tool:", error);
      return {
        success: false,
        message: `An error occurred during image to video conversion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
