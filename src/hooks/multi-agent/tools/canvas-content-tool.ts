
import { supabase } from "@/integrations/supabase/client";
import { getSceneById, getScenesByProjectId, updateSceneField, extractSceneContent } from "@/utils/canvas-data-utils";
import { CanvasScene, SceneUpdateType } from "@/types/canvas";

export const canvasContentTool = {
  name: "canvas_content",
  description: "View and edit content in Canvas scenes, including scripts, image prompts, scene descriptions, and voice over text",
  version: "1.0",
  requiredCredits: 0.1,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "list", "update", "extract"],
        description: "The action to perform on scene content"
      },
      projectId: {
        type: "string",
        description: "The ID of the project to operate on"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene to get or update"
      },
      contentType: {
        type: "string",
        enum: ["script", "imagePrompt", "description", "voiceOverText", "all"],
        description: "The type of content to get or update"
      },
      content: {
        type: "string",
        description: "The content to set when updating a scene field"
      }
    },
    required: ["action", "projectId"]
  },
  
  execute: async (params, context) => {
    try {
      const { action, projectId, sceneId, contentType, content } = params;
      
      switch (action) {
        case "get": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for get action",
              data: null
            };
          }
          
          const scene = await getSceneById(sceneId);
          if (!scene) {
            return {
              success: false,
              message: `Scene with ID ${sceneId} not found`,
              data: null
            };
          }
          
          if (!contentType || contentType === 'all') {
            return {
              success: true,
              message: "Scene content retrieved",
              data: scene
            };
          }
          
          const fieldContent = extractSceneContent(scene, contentType as SceneUpdateType);
          return {
            success: true,
            message: `Scene ${contentType} retrieved`,
            data: {
              sceneId,
              contentType,
              content: fieldContent
            }
          };
        }
          
        case "list": {
          const scenes = await getScenesByProjectId(projectId);
          return {
            success: true,
            message: `Retrieved ${scenes.length} scenes for project`,
            data: scenes
          };
        }
          
        case "update": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for update action",
              data: null
            };
          }
          
          if (!contentType || contentType === 'all') {
            return {
              success: false,
              message: "Content type is required for update action",
              data: null
            };
          }
          
          if (!content) {
            return {
              success: false,
              message: "Content is required for update action",
              data: null
            };
          }
          
          const success = await updateSceneField(
            sceneId, 
            contentType as SceneUpdateType, 
            content
          );
          
          if (!success) {
            return {
              success: false,
              message: `Failed to update scene ${contentType}`,
              data: null
            };
          }
          
          // Get the updated scene
          const updatedScene = await getSceneById(sceneId);
          
          return {
            success: true,
            message: `Scene ${contentType} updated successfully`,
            data: {
              sceneId,
              contentType,
              scene: updatedScene
            }
          };
        }
          
        case "extract": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for extract action",
              data: null
            };
          }
          
          const scene = await getSceneById(sceneId);
          if (!scene) {
            return {
              success: false,
              message: `Scene with ID ${sceneId} not found`,
              data: null
            };
          }
          
          const formattedContent = extractSceneContent(scene, contentType as SceneUpdateType);
          
          return {
            success: true,
            message: `Content extracted from scene ${scene.title}`,
            data: {
              sceneId,
              title: scene.title,
              formattedContent,
              contentType: contentType || 'all'
            }
          };
        }
          
        default:
          return {
            success: false,
            message: `Unsupported action: ${action}`,
            data: null
          };
      }
    } catch (error) {
      console.error("Canvas content tool error:", error);
      return {
        success: false,
        message: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }
};
