import { ToolDefinition, ToolContext, ToolExecutionResult } from './types';

interface ImageToVideoParams {
  image_url: string;
  prompt: string;
  duration?: string;
  aspect_ratio?: string;
}

export async function executeImageToVideoTool(
  parameters: ImageToVideoParams,
  context: ToolContext
): Promise<ToolExecutionResult> {
  try {
    // Validate required parameters
    if (!parameters.image_url) {
      return {
        success: false,
        message: "Source image URL is required",
        error: "Source image URL is required",
        state: "error"
      };
    }
    
    if (!parameters.prompt) {
      return {
        success: false,
        message: "Prompt is required",
        error: "Prompt is required",
        state: "error"
      };
    }
    
    // Set default values for optional parameters
    const duration = parameters.duration || "5";
    const aspectRatio = parameters.aspect_ratio || "9:16";
    
    // Call the Supabase Edge Function for image to video generation
    try {
      const { data, error } = await context.supabase.functions.invoke('generate-video-from-image', {
        body: {
          prompt: parameters.prompt,
          image_url: parameters.image_url,
          duration: duration,
          aspect_ratio: aspectRatio
        }
      });
      
      if (error) {
        console.error("Error calling image-to-video edge function:", error);
        return {
          success: false,
          message: error.message || "Failed to generate video",
          error: error.message,
          state: "error"
        };
      }
      
      // If the edge function returns an immediate result
      if (data.video_url) {
        return {
          success: true,
          message: "Video generated successfully",
          data: {
            result_url: data.video_url,
            thumbnail_url: data.thumbnail_url,
            duration: parameters.duration || "5",
            processing_time: data.processing_time || 0
          },
          state: "completed"
        };
      }
      
      // If the edge function started a job that needs to be tracked
      if (data.job_id) {
        // Create a job record in the database
        const { error: dbError } = await context.supabase.from('video_generation_jobs').insert({
          prompt: parameters.prompt,
          source_image_url: parameters.image_url,
          status: 'processing',
          user_id: context.user?.id,
          request_id: data.job_id,
          aspect_ratio: aspectRatio,
          duration: duration
        });
        
        if (dbError) {
          console.error("Error recording video generation job:", dbError);
          return {
            success: false,
            message: dbError.message || "Failed to record video generation job",
            error: dbError.message,
            state: "error"
          };
        }
        
        return {
          success: true,
          message: "Video generation started. Check the status later.",
          data: {
            job_id: data.job_id,
            status: "processing"
          },
          state: "processing"
        };
      }
      
      // If we reach here, something unexpected happened
      return {
        success: false,
        message: "Unexpected response from video generation service",
        error: "Unknown error",
        state: "error"
      };
    } catch (error) {
      console.error("Error in video generation:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error in video generation",
        error: error instanceof Error ? error.message : "Unknown error",
        state: "error"
      };
    }
  } catch (error) {
    console.error("Error executing image to video tool:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error executing image to video tool",
      error: error instanceof Error ? error.message : "Unknown error",
      state: "error"
    };
  }
}

// Create the tool definition
export const imageToVideoTool: ToolDefinition = {
  name: "image_to_video",
  description: "Generate videos from images with AI",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        description: "URL of the image to use as the source"
      },
      prompt: {
        type: "string",
        description: "Description of how the video should animate"
      },
      duration: {
        type: "string",
        description: "Duration of the video in seconds",
        enum: ["2", "3", "4", "5", "6"]
      },
      aspect_ratio: {
        type: "string",
        description: "Aspect ratio of the output video",
        enum: ["1:1", "16:9", "9:16", "4:3", "3:4"]
      }
    },
    required: ["image_url", "prompt"]
  },
  execute: executeImageToVideoTool,
  requiredCredits: 5,
  metadata: {
    category: "media",
    displayName: "Image to Video",
    icon: "video"
  },
  schema: {}
};
