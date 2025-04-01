
import { ToolDefinition, ToolExecutionResult } from "../../types";
import { CommandExecutionState } from "../../runner/types";

export const sdkCanvasDataTool: ToolDefinition = {
  name: "sdk_canvas_data",
  description: "Retrieve data from the Canvas project",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "The ID of the project to fetch data from"
      },
      sceneId: {
        type: "string",
        description: "Optional scene ID to fetch specific scene data"
      },
      dataType: {
        type: "string",
        description: "Type of data to fetch (project, scene, or all)",
        enum: ["project", "scene", "all"]
      }
    },
    required: ["projectId", "dataType"]
  },
  execute: async (parameters, context): Promise<ToolExecutionResult> => {
    try {
      const { projectId, sceneId, dataType } = parameters;
      
      if (!projectId) {
        return {
          success: false,
          message: "Project ID is required",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Fetch project data
      if (dataType === "project" || dataType === "all") {
        const { data: projectData, error: projectError } = await context.supabase
          .from('canvas_projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) {
          return {
            success: false,
            message: `Failed to fetch project data: ${projectError.message}`,
            state: CommandExecutionState.FAILED
          };
        }
        
        // If only project data was requested, return now
        if (dataType === "project") {
          return {
            success: true,
            message: "Project data retrieved successfully",
            data: projectData,
            state: CommandExecutionState.COMPLETED
          };
        }
      }
      
      // Fetch scene data if requested
      if (dataType === "scene" && sceneId) {
        const { data: sceneData, error: sceneError } = await context.supabase
          .from('canvas_scenes')
          .select('*')
          .eq('id', sceneId)
          .single();
          
        if (sceneError) {
          return {
            success: false,
            message: `Failed to fetch scene data: ${sceneError.message}`,
            state: CommandExecutionState.FAILED
          };
        }
        
        return {
          success: true,
          message: "Scene data retrieved successfully",
          data: sceneData,
          state: CommandExecutionState.COMPLETED
        };
      }
      
      // Fetch all scenes for the project
      if (dataType === "all") {
        const { data: scenesData, error: scenesError } = await context.supabase
          .from('canvas_scenes')
          .select('*')
          .eq('project_id', projectId)
          .order('scene_order', { ascending: true });
          
        if (scenesError) {
          return {
            success: false,
            message: `Failed to fetch scenes data: ${scenesError.message}`,
            state: CommandExecutionState.FAILED
          };
        }
        
        // Get project data again
        const { data: projectData, error: projectError } = await context.supabase
          .from('canvas_projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        // Combine project and scenes data
        return {
          success: true,
          message: "Project and scenes data retrieved successfully",
          data: {
            project: projectData,
            scenes: scenesData
          },
          state: CommandExecutionState.COMPLETED
        };
      }
      
      return {
        success: false,
        message: "Invalid dataType parameter",
        state: CommandExecutionState.FAILED
      };
    } catch (error) {
      console.error("Error executing SDK Canvas Data Tool:", error);
      return {
        success: false,
        message: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        state: CommandExecutionState.ERROR
      };
    }
  }
};
