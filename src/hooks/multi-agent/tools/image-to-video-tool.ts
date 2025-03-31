
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { v4 as uuidv4 } from "uuid";

export const imageToVideoTool: ToolDefinition = {
  name: "image-to-video",
  description: "Convert an image to a short video with animation effects",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Description of the desired animation or effect"
      },
      aspectRatio: {
        type: "string",
        description: "Aspect ratio of the output video (e.g., '16:9', '1:1', '9:16')"
      },
      duration: {
        type: "number",
        description: "Duration of the video in seconds"
      }
    },
    required: ["prompt"]
  },
  requiredCredits: 1.0,
  
  execute: async (params: {
    prompt: string;
    aspectRatio?: string;
    duration?: number;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Check if we have attachments (we need an image to convert)
      if (!context.attachments || context.attachments.length === 0) {
        throw new Error("No image provided. Please upload an image to convert to video.");
      }
      
      // Find the first image attachment
      const imageAttachment = context.attachments.find(a => 
        a.type === 'image' || 
        (a.contentType && a.contentType.startsWith('image/'))
      );
      
      if (!imageAttachment) {
        throw new Error("No suitable image found in attachments. Please upload an image.");
      }
      
      // Add processing message
      context.addMessage(`Processing your image-to-video request...`, 'tool');
      
      // In a real implementation, this would call an API to convert the image
      // For now, we'll simulate a successful conversion
      
      // Simulate API processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock video URL (in reality, this would be returned from the API)
      const videoId = uuidv4();
      const mockVideoUrl = `https://example.com/converted-videos/${videoId}.mp4`;
      
      return {
        success: true,
        data: {
          videoUrl: mockVideoUrl,
          thumbnailUrl: imageAttachment.url,
          duration: params.duration || 5,
          aspectRatio: params.aspectRatio || "16:9"
        },
        usage: {
          creditsUsed: 1.0
        }
      };
    } catch (error) {
      console.error("Error in imageToVideoTool:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error in image-to-video conversion"
      };
    }
  }
};
