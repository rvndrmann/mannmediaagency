
import { CommandExecutionState, ToolDefinition } from "./types";
import { WorkflowStage } from "@/types/canvas";
import { AgentSDKWorkflowManager } from "../sdk/AgentSDKWorkflowManager";

export const workflowTool: ToolDefinition = {
  name: "workflow_manager",
  description: "Manage workflow stages and track progress for video creation projects",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the project to manage workflow for"
      },
      action: {
        type: "string",
        description: "Action to perform",
        enum: [
          "start_workflow",
          "update_stage",
          "complete_workflow",
          "update_scene_status",
          "get_workflow_state"
        ]
      },
      stage: {
        type: "string",
        description: "Workflow stage to update",
        enum: [
          "planning",
          "script_writing",
          "scene_generation",
          "image_generation",
          "video_generation",
          "audio_generation",
          "final_compilation"
        ]
      },
      status: {
        type: "string",
        description: "Status to set for the stage or scene",
        enum: [
          "pending",
          "in_progress",
          "completed",
          "failed"
        ]
      },
      sceneId: {
        type: "string",
        description: "ID of the scene to update status for"
      },
      result: {
        type: "object",
        description: "Result data to store with the stage update"
      }
    },
    required: ["projectId", "action"]
  },
  metadata: {
    category: "workflow",
    displayName: "Workflow Manager",
    icon: "workflow"
  },
  async execute(parameters, context) {
    try {
      const { projectId, action, stage, status, sceneId, result } = parameters;
      
      if (!projectId) {
        return {
          success: false,
          message: "Project ID is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Create manager with new constructor pattern
      const workflowManager = new AgentSDKWorkflowManager();
      await workflowManager.setProject(projectId);
      
      let response: any;
      
      switch (action) {
        case "start_workflow":
          response = await workflowManager.startWorkflow();
          return {
            success: true,
            message: "Workflow started successfully",
            data: response,
            state: CommandExecutionState.COMPLETED
          };
          
        case "update_stage":
          if (!stage || !status) {
            return {
              success: false,
              message: "Stage and status are required for update_stage action",
              state: CommandExecutionState.FAILED
            };
          }
          
          response = await workflowManager.updateWorkflowStage(
            stage as WorkflowStage, 
            status as any,
            result
          );
          
          return {
            success: true,
            message: `Workflow stage ${stage} updated to ${status}`,
            data: response,
            state: CommandExecutionState.COMPLETED
          };
          
        case "complete_workflow":
          response = await workflowManager.completeWorkflow();
          return {
            success: true,
            message: "Workflow completed successfully",
            data: response,
            state: CommandExecutionState.COMPLETED
          };
          
        case "update_scene_status":
          if (!sceneId || !status) {
            return {
              success: false,
              message: "Scene ID and status are required for update_scene_status action",
              state: CommandExecutionState.FAILED
            };
          }
          
          response = await workflowManager.updateSceneStatus(
            sceneId,
            status as any,
            result
          );
          
          return {
            success: true,
            message: `Scene ${sceneId} status updated to ${status}`,
            data: response,
            state: CommandExecutionState.COMPLETED
          };
          
        case "get_workflow_state":
          response = workflowManager.getWorkflowState();
          return {
            success: true,
            message: "Workflow state retrieved",
            data: response,
            state: CommandExecutionState.COMPLETED
          };
          
        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
            state: CommandExecutionState.FAILED
          };
      }
    } catch (error) {
      console.error("Error executing workflow tool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }
  }
};
