
import { v4 as uuidv4 } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js";
import { CommandExecutionState, ToolExecutionResult } from "../../runner/types";

export interface CanvasDataToolContext {
  projectId?: string;
  sceneId?: string;
  supabase: SupabaseClient;
  userId?: string;
}

export class SdkCanvasDataTool {
  static name = "canvas_data_tool";
  static description = "Get or update data related to Canvas projects and scenes";
  
  static parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get_project", "get_scene", "update_scene", "list_scenes", "create_scene"],
        description: "The action to perform"
      },
      projectId: {
        type: "string",
        description: "The ID of the project"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene (for scene-specific actions)"
      },
      data: {
        type: "object",
        description: "Data to update"
      }
    },
    required: ["action"]
  };
  
  static async execute(parameters: any, context: CanvasDataToolContext): Promise<ToolExecutionResult> {
    try {
      const { action, projectId, sceneId, data } = parameters;
      const { supabase } = context;
      
      if (!supabase) {
        return {
          success: false,
          message: "Supabase client is required",
          state: CommandExecutionState.ERROR,
        };
      }
      
      // Use project ID from context if not provided
      const targetProjectId = projectId || context.projectId;
      
      switch (action) {
        case "get_project":
          return await this.getProject(supabase, targetProjectId);
          
        case "get_scene":
          return await this.getScene(supabase, sceneId || context.sceneId);
          
        case "update_scene":
          return await this.updateScene(supabase, sceneId || context.sceneId, data);
          
        case "list_scenes":
          return await this.listScenes(supabase, targetProjectId);
          
        case "create_scene":
          return await this.createScene(supabase, targetProjectId, data);
          
        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
            state: CommandExecutionState.ERROR,
          };
      }
    } catch (error) {
      console.error("Error in CanvasDataTool:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        state: CommandExecutionState.ERROR,
      };
    }
  }
  
  private static async getProject(supabase: SupabaseClient, projectId?: string): Promise<ToolExecutionResult> {
    if (!projectId) {
      return {
        success: false,
        message: "Project ID is required",
        state: CommandExecutionState.ERROR,
      };
    }
    
    try {
      const { data, error } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .single();
        
      if (error) throw error;
      
      return {
        success: true,
        message: "Project retrieved successfully",
        data,
        state: CommandExecutionState.COMPLETED,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to retrieve project",
        state: CommandExecutionState.ERROR,
      };
    }
  }
  
  private static async getScene(supabase: SupabaseClient, sceneId?: string): Promise<ToolExecutionResult> {
    if (!sceneId) {
      return {
        success: false,
        message: "Scene ID is required",
        state: CommandExecutionState.ERROR,
      };
    }
    
    try {
      const { data, error } = await supabase
        .from("canvas_scenes")
        .select("*")
        .eq("id", sceneId)
        .single();
        
      if (error) throw error;
      
      return {
        success: true,
        message: "Scene retrieved successfully",
        data,
        state: CommandExecutionState.COMPLETED,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to retrieve scene",
        state: CommandExecutionState.ERROR,
      };
    }
  }
  
  // More methods...
}
