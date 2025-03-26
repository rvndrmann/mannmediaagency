
import { ToolDefinition, ToolResult, ToolContext } from "../types";
import { Command } from "@/types/message";

export const imageToVideoTool: ToolDefinition = {
  name: "image-to-video",
  description: "Transform static images into dynamic videos with motion and effects",
  version: "1.0.0",
  requiredCredits: 5,
  parameters: [
    {
      name: "sourceImage",
      type: "string",
      description: "URL or attachment of the image to animate",
      required: true,
      prompt: "Upload or provide a URL to the image you want to animate"
    },
    {
      name: "prompt",
      type: "string",
      description: "Description of how the image should be animated",
      required: true
    },
    {
      name: "aspectRatio",
      type: "string",
      description: "Aspect ratio for the video (16:9, 9:16, 1:1)",
      required: false
    },
    {
      name: "duration",
      type: "string",
      description: "Duration of the video in seconds",
      required: false
    }
  ],
  
  async execute(command: Command, context: ToolContext): Promise<ToolResult> {
    try {
      // Extract the source image from attachments or URL
      const sourceImageParam = command.parameters?.sourceImage as string;
      let sourceImageUrl = sourceImageParam;
      
      // Check if we have attachments and use the first image
      if (context.attachments && context.attachments.length > 0) {
        const imageAttachment = context.attachments.find(att => 
          att.type.startsWith('image/') || att.contentType?.startsWith('image/')
        );
        if (imageAttachment) {
          sourceImageUrl = imageAttachment.url;
        }
      }
      
      if (!sourceImageUrl) {
        return {
          success: false,
          message: "Source image is required. Please upload an image or provide a URL."
        };
      }
      
      // Extract other parameters
      const prompt = command.parameters?.prompt as string;
      if (!prompt) {
        return {
          success: false,
          message: "Prompt describing the animation is required."
        };
      }
      
      const aspectRatio = command.parameters?.aspectRatio as string || "16:9";
      const duration = command.parameters?.duration as string || "5";
      
      // Call the Supabase function to generate the video
      const { data, error } = await context.supabase.functions.invoke("image-to-video", {
        body: {
          sourceImageUrl,
          prompt,
          aspectRatio,
          duration
        }
      });
      
      if (error) {
        console.error("Error generating video:", error);
        return {
          success: false,
          message: `Failed to start video generation: ${error.message || "Unknown error"}`
        };
      }
      
      return {
        success: true,
        message: `Video generation started successfully. Job ID: ${data.jobId}`,
        data: {
          jobId: data.jobId,
          estimatedTime: data.estimatedTime || "60-90 seconds",
          checkStatusUrl: `/video-generation/${data.jobId}`
        }
      };
    } catch (error) {
      console.error("Error executing image-to-video tool:", error);
      return {
        success: false,
        message: `Error with image-to-video tool: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
};
