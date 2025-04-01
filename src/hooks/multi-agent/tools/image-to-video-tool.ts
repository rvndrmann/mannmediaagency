
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ToolDefinition, ToolExecutionResult } from "../types";

interface ImageToVideoRequest {
  sourceImageUrl: string;
  prompt: string;
  aspectRatio?: string;
  duration?: string;
}

export const imageToVideoTool: ToolDefinition = {
  name: "image-to-video-tool",
  description: "Generate a video from an image",
  execute: async function(params: any): Promise<ToolExecutionResult> {
    try {
      const { action, sourceImageUrl, prompt, aspectRatio, duration } = params;
      
      if (!action) {
        return {
          success: false,
          message: "Missing required parameter: action",
          error: "Missing required parameter: action",
          state: "error"
        };
      }
      
      if (action === "generate") {
        if (!sourceImageUrl) {
          return {
            success: false,
            message: "Missing required parameter: sourceImageUrl",
            error: "You must provide a source image URL",
            state: "error"
          };
        }
        
        try {
          const response = await generateVideo({
            sourceImageUrl,
            prompt: prompt || "",
            aspectRatio: aspectRatio || "16:9",
            duration: duration || "5"
          });
          
          return {
            success: true,
            message: "Video generation started successfully",
            data: {
              jobId: response.jobId,
              status: "processing"
            },
            state: "processing"
          };
        } catch (error) {
          return {
            success: false,
            message: "Failed to start video generation",
            error: error,
            state: "error"
          };
        }
      } else if (action === "check-status") {
        const jobId = params.jobId;
        
        if (!jobId) {
          return {
            success: false,
            message: "Missing required parameter: jobId",
            error: "You must provide a job ID to check status",
            state: "error"
          };
        }
        
        try {
          const status = await checkVideoStatus(jobId);
          
          if (status.status === "completed") {
            return {
              success: true,
              message: "Video generation completed",
              data: {
                result_url: status.resultUrl,
                thumbnail_url: status.thumbnailUrl,
                duration: status.duration || "5",
                processing_time: status.processingTime || 30
              },
              usage: {
                creditsUsed: 1
              },
              state: "completed"
            };
          } else if (status.status === "failed") {
            return {
              success: false,
              message: "Video generation failed",
              error: status.error || "Unknown error",
              state: "error"
            };
          } else {
            return {
              success: false,
              message: "Video is still processing",
              error: "Video generation is not yet complete",
              state: "processing"
            };
          }
        } catch (error) {
          return {
            success: false,
            message: "Failed to check video status",
            error: error,
            state: "error"
          };
        }
      }
      
      return {
        success: false,
        message: "Invalid action. Use 'generate' or 'check-status'",
        error: "Invalid action parameter",
        state: "error"
      };
    } catch (error) {
      return {
        success: false,
        message: "An unexpected error occurred",
        error: error,
        state: "error"
      };
    }
  },
  schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["generate", "check-status"],
        description: "The action to perform (generate or check-status)"
      },
      sourceImageUrl: {
        type: "string",
        description: "URL of the source image to generate video from"
      },
      prompt: {
        type: "string",
        description: "Description of the video to generate"
      },
      aspectRatio: {
        type: "string",
        enum: ["16:9", "9:16", "1:1"],
        description: "Aspect ratio of the output video"
      },
      duration: {
        type: "string",
        description: "Duration of the output video in seconds"
      },
      jobId: {
        type: "string",
        description: "Job ID to check status for (only required for check-status action)"
      }
    },
    required: ["action"]
  }
};

// Helper function to generate a video
async function generateVideo(request: ImageToVideoRequest): Promise<{ jobId: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-video-from-image", {
      body: request
    });
    
    if (error) {
      console.error("Error generating video:", error);
      throw error;
    }
    
    if (!data?.jobId) {
      throw new Error("No job ID returned from the service");
    }
    
    toast.success("Video generation has started");
    return { jobId: data.jobId };
  } catch (error) {
    console.error("Failed to generate video:", error);
    toast.error("Failed to start video generation");
    throw error;
  }
}

// Helper function to check video status
async function checkVideoStatus(jobId: string): Promise<{
  status: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  processingTime?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("check-video-status", {
      body: { jobId }
    });
    
    if (error) {
      console.error("Error checking video status:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Failed to check video status:", error);
    throw error;
  }
}
