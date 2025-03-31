
import { ToolDefinition } from "../types";
import { CommandExecutionState } from "../types";

export const canvasTool: ToolDefinition = {
  name: "canvas_tool",
  description: "Generate content for canvas scenes",
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
      action: {
        type: "string",
        description: "Action to perform",
        enum: ["generate_description", "generate_script", "generate_image_prompt", "generate_voiceover"]
      },
      content: {
        type: "string",
        description: "Content to add"
      }
    },
    required: ["projectId", "action"]
  },
  metadata: {
    category: "canvas",
    displayName: "Canvas Tool",
    icon: "canvas"
  },
  async execute(parameters, context) {
    try {
      const { projectId, sceneId, action, content } = parameters;
      
      if (!projectId) {
        return {
          success: false,
          message: "Project ID is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      if (!action) {
        return {
          success: false,
          message: "Action is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      return {
        success: true,
        message: `Canvas action ${action} performed successfully for project ${projectId}${sceneId ? ` scene ${sceneId}` : ''}`,
        data: { projectId, sceneId, action },
        state: CommandExecutionState.COMPLETED
      };
    } catch (error) {
      console.error("Error executing canvas tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }
  }
};
