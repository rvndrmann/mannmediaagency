
import { ToolDefinition, ToolContext, ToolResult, CommandExecutionState } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Create a singleton instance to avoid multiple service instantiation
const canvasService = {
  async updateScene(sceneId: string, data: any) {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .update(data)
        .eq('id', sceneId);
      
      return !error;
    } catch (error) {
      console.error("Error updating scene:", error);
      return false;
    }
  },
  
  async createScene(projectId: string, data: any) {
    try {
      const { data: newScene, error } = await supabase
        .from('canvas_scenes')
        .insert([{
          project_id: projectId,
          ...data
        }])
        .select()
        .single();
      
      if (error) throw error;
      return newScene;
    } catch (error) {
      console.error("Error creating scene:", error);
      return null;
    }
  }
};

export const canvasTool: ToolDefinition = {
  name: "canvas",
  description: "Create and update video scenes in the Canvas system",
  requiredCredits: 0.2,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["updateDescription", "generateImagePrompt", "generateImage", "generateVideo", "createScene", "updateScene"],
        description: "The action to perform on the canvas"
      },
      projectId: {
        type: "string",
        description: "The ID of the project to operate on"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene to update (for update operations)"
      },
      content: {
        type: "string",
        description: "The content to set (description, image prompt, etc.)"
      },
      useMcp: {
        type: "boolean",
        description: "Whether to use Model Context Protocol for this operation",
        default: true
      },
      productShotVersion: {
        type: "string",
        enum: ["v1", "v2"],
        description: "Which product shot version to use for image generation"
      },
      aspectRatio: {
        type: "string",
        enum: ["16:9", "9:16", "1:1"],
        description: "The aspect ratio to use for video generation"
      }
    },
    required: ["action", "projectId"]
  },
  
  metadata: {
    category: "canvas",
    displayName: "Canvas Operations",
    icon: "layers"
  },
  
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const { action, projectId, sceneId, content } = params;
      
      // Handle different actions
      switch (action) {
        case "updateScene": {
          if (!sceneId) {
            return {
              success: false,
              message: "sceneId is required for updateScene action",
              error: "sceneId is required for updateScene action",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Update scene script
          const success = await canvasService.updateScene(sceneId, {
            script: content
          });
          
          return {
            success,
            message: success ? "Scene updated" : "Failed to update scene",
            data: { sceneId },
            state: success ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED
          };
        }
        
        case "createScene": {
          // Create a new scene
          const scene = await canvasService.createScene(projectId, {
            script: content || ""
          });
          
          return {
            success: !!scene,
            message: scene ? "New scene created" : "Failed to create scene",
            data: scene ? { sceneId: scene.id } : null,
            state: scene ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED
          };
        }
        
        default:
          return {
            success: false,
            message: `Unsupported action: ${action}`,
            error: `Unsupported action: ${action}`,
            state: CommandExecutionState.FAILED
          };
      }
    } catch (error) {
      console.error("Canvas tool error:", error);
      return {
        success: false,
        message: `Canvas operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        state: CommandExecutionState.FAILED
      };
    }
  }
};
