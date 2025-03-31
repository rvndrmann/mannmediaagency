
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";

export const canvasDataTool: ToolDefinition = {
  name: "canvas_data",
  description: "Retrieve or manipulate data related to canvas projects and scenes",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform on canvas data",
        enum: ["get_project", "get_scene", "list_projects", "list_scenes"]
      },
      project_id: {
        type: "string",
        description: "ID of the canvas project (required for project-specific operations)"
      },
      scene_id: {
        type: "string",
        description: "ID of the canvas scene (required for scene-specific operations)"
      },
      limit: {
        type: "number",
        description: "Maximum number of items to return for list operations"
      }
    },
    required: ["operation"]
  },
  requiredCredits: 0,
  metadata: {
    category: "data",
    displayName: "Canvas Data",
    icon: "Database"
  },
  execute: async (params: {
    operation: string;
    project_id?: string;
    scene_id?: string;
    limit?: number;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Verify the tool is available
      if (!context.toolAvailable) {
        return {
          success: false,
          message: "Canvas data tool is not available",
          error: "Tool unavailable"
        };
      }
      
      // Verify user ID is present in context
      if (!context.userId) {
        return {
          success: false,
          message: "User ID is required to access canvas data",
          error: "Missing user ID"
        };
      }
      
      // Log the operation
      console.log(`Canvas data tool - Operation: ${params.operation}`);
      
      // Execute the requested operation
      switch (params.operation) {
        case "get_project":
          return await getCanvasProject(params.project_id, context);
          
        case "get_scene":
          return await getCanvasScene(params.scene_id, params.project_id, context);
          
        case "list_projects":
          return await listCanvasProjects(params.limit || 10, context);
          
        case "list_scenes":
          return await listCanvasScenes(params.project_id, params.limit || 10, context);
          
        default:
          return {
            success: false,
            message: `Unknown operation: ${params.operation}`,
            error: "Invalid operation"
          };
      }
    } catch (error: any) {
      console.error("Error in canvas data tool:", error);
      
      return {
        success: false,
        message: `Canvas data error: ${error.message}`,
        error: error.message
      };
    }
  }
};

// Helper function to get a single canvas project
async function getCanvasProject(projectId: string | undefined, context: ToolContext): Promise<ToolExecutionResult> {
  if (!projectId) {
    return {
      success: false,
      message: "Project ID is required for the get_project operation",
      error: "Missing project ID"
    };
  }
  
  try {
    const { data, error } = await supabase
      .from("canvas_projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", context.userId)
      .single();
      
    if (error) {
      throw error;
    }
    
    if (!data) {
      return {
        success: false,
        message: `No project found with ID: ${projectId}`,
        error: "Project not found"
      };
    }
    
    return {
      success: true,
      message: "Canvas project retrieved successfully",
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error retrieving canvas project: ${error.message}`,
      error: error.message
    };
  }
}

// Helper function to get a single canvas scene
async function getCanvasScene(sceneId: string | undefined, projectId: string | undefined, context: ToolContext): Promise<ToolExecutionResult> {
  if (!sceneId) {
    return {
      success: false,
      message: "Scene ID is required for the get_scene operation",
      error: "Missing scene ID"
    };
  }
  
  try {
    // Build the query
    let query = supabase
      .from("canvas_scenes")
      .select("*")
      .eq("id", sceneId);
      
    // Add project ID filter if provided
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    
    const { data, error } = await query.single();
      
    if (error) {
      throw error;
    }
    
    // Verify the scene belongs to a project owned by the user
    const { data: projectData, error: projectError } = await supabase
      .from("canvas_projects")
      .select("user_id")
      .eq("id", data.project_id)
      .single();
      
    if (projectError || projectData.user_id !== context.userId) {
      return {
        success: false,
        message: "You don't have permission to access this scene",
        error: "Access denied"
      };
    }
    
    return {
      success: true,
      message: "Canvas scene retrieved successfully",
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error retrieving canvas scene: ${error.message}`,
      error: error.message
    };
  }
}

// Helper function to list canvas projects
async function listCanvasProjects(limit: number, context: ToolContext): Promise<ToolExecutionResult> {
  try {
    const { data, error } = await supabase
      .from("canvas_projects")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      message: `Retrieved ${data.length} canvas projects`,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error listing canvas projects: ${error.message}`,
      error: error.message
    };
  }
}

// Helper function to list canvas scenes
async function listCanvasScenes(projectId: string | undefined, limit: number, context: ToolContext): Promise<ToolExecutionResult> {
  if (!projectId) {
    return {
      success: false,
      message: "Project ID is required for the list_scenes operation",
      error: "Missing project ID"
    };
  }
  
  try {
    // Verify project ownership
    const { data: projectData, error: projectError } = await supabase
      .from("canvas_projects")
      .select("user_id")
      .eq("id", projectId)
      .eq("user_id", context.userId)
      .single();
      
    if (projectError || !projectData) {
      return {
        success: false,
        message: "You don't have permission to access this project's scenes",
        error: "Access denied"
      };
    }
    
    // Get scenes for the project
    const { data, error } = await supabase
      .from("canvas_scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("scene_order", { ascending: true })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      message: `Retrieved ${data.length} canvas scenes for project ${projectId}`,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error listing canvas scenes: ${error.message}`,
      error: error.message
    };
  }
}
