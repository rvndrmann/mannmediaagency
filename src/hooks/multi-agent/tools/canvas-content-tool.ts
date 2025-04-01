
import { ToolDefinition } from "../types";
import { CommandExecutionState } from "../types";
import { CanvasScene } from "@/types/canvas";

export const canvasContentTool: ToolDefinition = {
  name: "canvas_content_tool",
  description: "Manage and generate content for canvas scenes",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the canvas project"
      },
      sceneId: {
        type: "string",
        description: "ID of the scene to modify"
      },
      contentType: {
        type: "string",
        description: "Type of content to generate",
        enum: ["script", "description", "imagePrompt", "voiceOver", "title"]
      },
      content: {
        type: "string",
        description: "Content to add or update"
      }
    },
    required: ["projectId", "contentType", "content"]
  },
  metadata: {
    category: "canvas",
    displayName: "Canvas Content Tool",
    icon: "pencil"
  },
  async execute(parameters, context) {
    try {
      const { projectId, sceneId, contentType, content } = parameters;
      
      if (!projectId) {
        return {
          success: false,
          message: "Project ID is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      if (!contentType) {
        return {
          success: false,
          message: "Content type is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      if (!content) {
        return {
          success: false,
          message: "Content is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Format content based on the content type
      let formattedContent = content;
      if (contentType === 'script' && !content.includes('\n')) {
        formattedContent = content.split('. ').join('.\n\n');
      }
      
      // If we have a sceneId, we're updating an existing scene
      if (sceneId) {
        // In a real implementation, this would update the scene in the database
        // For now, we'll just return the updated content
        return {
          success: true,
          message: `Content ${contentType} updated successfully for scene ${sceneId}`,
          data: {
            sceneId,
            contentType,
            content: formattedContent
          },
          state: CommandExecutionState.COMPLETED
        };
      } else {
        // Create a new scene with the provided content
        return {
          success: true,
          message: `Created new scene with ${contentType}`,
          data: {
            title: contentType === 'title' ? content : `New Scene`,
            scene: {
              [contentType]: formattedContent
            },
            formattedContent
          },
          state: CommandExecutionState.COMPLETED
        };
      }
    } catch (error) {
      console.error("Error executing canvas content tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }
  }
};
