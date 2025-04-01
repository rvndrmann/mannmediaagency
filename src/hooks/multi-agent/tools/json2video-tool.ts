
import { CommandExecutionState, ToolDefinition } from "./types";

export const json2videoTool: ToolDefinition = {
  name: "json2video_tool",
  description: "Create and manage video projects using json2video API",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the canvas project"
      },
      action: {
        type: "string",
        description: "Action to perform",
        enum: [
          "create_video", 
          "check_status",
          "get_video_url"
        ]
      },
      sceneIds: {
        type: "array",
        items: {
          type: "string"
        },
        description: "IDs of scenes to include in the video"
      },
      videoConfig: {
        type: "object",
        description: "Configuration options for the video"
      }
    },
    required: ["projectId", "action"]
  },
  metadata: {
    category: "video",
    displayName: "JSON2Video Tool",
    icon: "video"
  },
  async execute(parameters, context) {
    try {
      const { projectId, action, sceneIds, videoConfig } = parameters;
      
      if (!projectId) {
        return {
          success: false,
          message: "Project ID is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Return a command object that will be processed by the UI
      return {
        success: true,
        message: `Video action "${action}" will be performed for project ${projectId}`,
        data: { 
          command: {
            action,
            projectId,
            sceneIds: sceneIds || [],
            videoConfig: videoConfig || {}
          }
        },
        state: CommandExecutionState.COMPLETED
      };
    } catch (error) {
      console.error("Error executing JSON2Video tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }
  }
};
