
import { CommandExecutionState, ToolDefinition } from "./types";

export const canvasTool: ToolDefinition = {
  name: "canvas_tool",
  description: "Generate and update content for canvas scenes",
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
        enum: [
          "generate_script", 
          "generate_description", 
          "generate_image_prompt", 
          "generate_scene_image", 
          "generate_voiceover",
          "create_scene",
          "delete_scene",
          "generate_full_video",
          "list_project_scenes",
          "get_scene_details"
        ]
      },
      content: {
        type: "string",
        description: "Content to use for generation or direct update"
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
      
      if (action !== "list_project_scenes" && action !== "create_scene" && !sceneId) {
        return {
          success: false,
          message: "Scene ID is required for this action",
          state: CommandExecutionState.FAILED
        };
      }
      
      // For now, we'll return a command object that will be processed by the UI
      return {
        success: true,
        message: `Canvas action "${action}" will be performed for ${sceneId ? `scene ${sceneId}` : ''} in project ${projectId}`,
        data: { 
          command: {
            action,
            projectId,
            sceneId,
            content: content || ""
          }
        },
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
