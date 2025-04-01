
import { ToolDefinition, ToolContext, ToolResult, CommandExecutionState } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { SceneUpdateType } from "@/types/canvas";
import { mapSceneUpdateTypeToDbField } from "@/utils/canvas-data-utils";

// Create a singleton instance to avoid multiple service instantiation
const canvasService = {
  async updateScene(sceneId: string, updateType: SceneUpdateType, value: string) {
    try {
      const dbField = mapSceneUpdateTypeToDbField(updateType);
      const updates = { [dbField]: value };
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(updates)
        .eq('id', sceneId);
      
      return !error;
    } catch (error) {
      console.error("Error updating scene:", error);
      return false;
    }
  },
  
  async createScene(projectId: string, data: any) {
    try {
      // Ensure scene_order is provided or calculated
      if (!data.scene_order) {
        const { data: existingScenes } = await supabase
          .from('canvas_scenes')
          .select('scene_order')
          .eq('project_id', projectId)
          .order('scene_order', { ascending: false })
          .limit(1);
          
        const nextOrder = existingScenes && existingScenes.length > 0
          ? (existingScenes[0].scene_order || 0) + 1
          : 1;
          
        data.scene_order = nextOrder;
      }
      
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
      updateType: {
        type: "string",
        enum: ["script", "imagePrompt", "description", "image", "imageUrl", "productImage", "video", "voiceOver", "backgroundMusic", "voiceOverText"],
        description: "The type of update to perform"
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
      const { action, projectId, sceneId, updateType, content } = params;
      
      // Handle different actions
      switch (action) {
        case "updateScene": {
          if (!sceneId || !updateType) {
            return {
              success: false,
              message: "sceneId and updateType are required for updateScene action",
              error: "sceneId and updateType are required for updateScene action",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Update scene with specified update type
          const success = await canvasService.updateScene(
            sceneId, 
            updateType as SceneUpdateType, 
            content || ""
          );
          
          return {
            success,
            message: success ? `Scene ${updateType} updated` : `Failed to update scene ${updateType}`,
            data: { sceneId, updateType },
            state: success ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED
          };
        }
        
        case "createScene": {
          // Create a new scene
          const scene = await canvasService.createScene(projectId, {
            script: content || "",
            title: "New Scene"
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
