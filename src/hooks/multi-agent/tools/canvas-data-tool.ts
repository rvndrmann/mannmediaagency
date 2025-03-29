
import { supabase } from "@/integrations/supabase/client";
import { getSceneById, getScenesByProjectId } from "@/utils/canvas-data-utils";

export const canvasDataTool = {
  name: "canvas_data",
  description: "Extract and manage media data in Canvas scenes, including images, videos, and other assets",
  version: "1.0",
  requiredCredits: 0.1,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["extract_image", "extract_video", "list_media", "import_media", "get_scene_media"],
        description: "The action to perform on media data"
      },
      projectId: {
        type: "string",
        description: "The ID of the project to operate on"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene to get media from or import to"
      },
      mediaType: {
        type: "string",
        enum: ["scene_image", "product_image", "scene_video", "voice_over", "background_music"],
        description: "The type of media to extract or import"
      },
      mediaUrl: {
        type: "string",
        description: "The URL of media to import (for import operations)"
      }
    },
    required: ["action", "projectId"]
  },
  
  execute: async (params, context) => {
    try {
      const { action, projectId, sceneId, mediaType, mediaUrl } = params;
      
      switch (action) {
        case "extract_image": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for extract_image action",
              data: null
            };
          }
          
          if (!mediaType || !['scene_image', 'product_image'].includes(mediaType)) {
            return {
              success: false,
              message: "Valid mediaType (scene_image or product_image) is required",
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
          
          const imageUrl = mediaType === 'scene_image' ? scene.imageUrl : scene.productImageUrl;
          
          return {
            success: !!imageUrl,
            message: imageUrl ? `${mediaType} extracted successfully` : `No ${mediaType} found in scene`,
            data: {
              sceneId,
              mediaType,
              url: imageUrl,
              title: scene.title
            }
          };
        }
          
        case "extract_video": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for extract_video action",
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
          
          const videoUrl = scene.videoUrl;
          
          return {
            success: !!videoUrl,
            message: videoUrl ? "Scene video extracted successfully" : "No video found in scene",
            data: {
              sceneId,
              url: videoUrl,
              title: scene.title,
              duration: scene.duration
            }
          };
        }
          
        case "list_media": {
          const scenes = await getScenesByProjectId(projectId);
          
          const mediaList = scenes.map(scene => ({
            sceneId: scene.id,
            title: scene.title,
            hasSceneImage: !!scene.imageUrl,
            hasProductImage: !!scene.productImageUrl,
            hasVideo: !!scene.videoUrl,
            hasVoiceOver: !!scene.voiceOverUrl,
            hasBackgroundMusic: !!scene.backgroundMusicUrl
          }));
          
          return {
            success: true,
            message: `Found media information for ${scenes.length} scenes`,
            data: mediaList
          };
        }
          
        case "import_media": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for import_media action",
              data: null
            };
          }
          
          if (!mediaType) {
            return {
              success: false,
              message: "Media type is required for import_media action",
              data: null
            };
          }
          
          if (!mediaUrl) {
            return {
              success: false,
              message: "Media URL is required for import_media action",
              data: null
            };
          }
          
          const typeMapping = {
            'scene_image': 'image_url',
            'product_image': 'product_image_url',
            'scene_video': 'video_url',
            'voice_over': 'voice_over_url',
            'background_music': 'background_music_url'
          };
          
          const dbField = typeMapping[mediaType];
          if (!dbField) {
            return {
              success: false,
              message: `Invalid media type: ${mediaType}`,
              data: null
            };
          }
          
          // Update the scene with the new media URL
          const { error } = await supabase
            .from('canvas_scenes')
            .update({ [dbField]: mediaUrl })
            .eq('id', sceneId);
          
          if (error) {
            throw new Error(`Error updating scene: ${error.message}`);
          }
          
          return {
            success: true,
            message: `${mediaType} imported successfully`,
            data: {
              sceneId,
              mediaType,
              url: mediaUrl
            }
          };
        }
          
        case "get_scene_media": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for get_scene_media action",
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
          
          return {
            success: true,
            message: "Scene media retrieved successfully",
            data: {
              sceneId: scene.id,
              title: scene.title,
              imageUrl: scene.imageUrl,
              productImageUrl: scene.productImageUrl,
              videoUrl: scene.videoUrl,
              voiceOverUrl: scene.voiceOverUrl,
              backgroundMusicUrl: scene.backgroundMusicUrl
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
      console.error("Canvas data tool error:", error);
      return {
        success: false,
        message: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }
};
