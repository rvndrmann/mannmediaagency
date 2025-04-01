
import { ToolContext } from "../../tools/types";
import { SDKTool } from "../types";
import { CommandExecutionState } from "../../runner/types";

interface UpdateSceneParams {
  sceneId: string;
  field: string;
  value: string;
}

interface ListScenesParams {
  projectId: string;
}

interface CreateSceneParams {
  projectId: string;
  title: string;
  description?: string;
}

class SdkCanvasDataTool implements SDKTool {
  name = "canvas_data";
  description = "Get or update canvas project data like scenes, scripts, etc.";
  version = "1.0";
  
  // Static methods to be referenced in the schema
  static async updateScene(params: UpdateSceneParams, context: ToolContext) {
    const { sceneId, field, value } = params;
    
    if (!sceneId) {
      throw new Error("Scene ID is required");
    }
    
    if (!field) {
      throw new Error("Field name is required");
    }
    
    try {
      if (context.updateScene) {
        await context.updateScene(sceneId, field, value);
        return { success: true, message: `Updated ${field} for scene ${sceneId}` };
      } else {
        throw new Error("updateScene function not available in context");
      }
    } catch (error) {
      console.error("Error updating scene:", error);
      throw new Error(`Failed to update scene: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  static async listScenes(params: ListScenesParams, context: ToolContext) {
    const { projectId } = params;
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    
    try {
      // This would typically get scenes from a database
      // For now, we'll return mock data if available in context
      const scenes = context.scenes || [];
      return { scenes, count: scenes.length };
    } catch (error) {
      console.error("Error listing scenes:", error);
      throw new Error(`Failed to list scenes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  static async createScene(params: CreateSceneParams, context: ToolContext) {
    const { projectId, title, description } = params;
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    
    if (!title) {
      throw new Error("Scene title is required");
    }
    
    try {
      if (context.createScene) {
        const sceneData = {
          title,
          description: description || ""
        };
        
        const sceneId = await context.createScene(projectId, sceneData);
        return { success: true, sceneId, message: `Created new scene "${title}"` };
      } else {
        throw new Error("createScene function not available in context");
      }
    } catch (error) {
      console.error("Error creating scene:", error);
      throw new Error(`Failed to create scene: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  schema = {
    type: "function",
    function: {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["updateScene", "listScenes", "createScene"],
            description: "The action to perform on canvas data"
          },
          params: {
            type: "object",
            description: "Parameters for the selected action"
          }
        },
        required: ["action", "params"]
      }
    }
  };
  
  async execute(parameters: any, context: ToolContext) {
    const { action, params } = parameters;
    
    if (!action) {
      return {
        success: false,
        message: "Action is required",
        state: CommandExecutionState.ERROR
      };
    }
    
    try {
      switch (action) {
        case "updateScene":
          return await SdkCanvasDataTool.updateScene(params, context);
        
        case "listScenes":
          return await SdkCanvasDataTool.listScenes(params, context);
        
        case "createScene":
          return await SdkCanvasDataTool.createScene(params, context);
        
        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
            state: CommandExecutionState.ERROR
          };
      }
    } catch (error) {
      console.error(`Error executing canvas data tool (${action}):`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.ERROR
      };
    }
  }
}

export const sdkCanvasDataTool = new SdkCanvasDataTool();
