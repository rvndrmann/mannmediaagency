import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, RunnerContext } from "../../runner/types";
import { CanvasService } from "@/services/canvas/CanvasService";

export const canvasTool: ToolDefinition = {
  name: "canvas",
  description: "Manage Canvas projects and scenes for video creation",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The action to perform on Canvas projects",
        enum: ["listProjects", "getProject", "createProject", "updateProject", "listScenes", "getScene", "createScene", "updateScene", "generateImage", "generateVideo"]
      },
      projectId: {
        type: "string",
        description: "The ID of the project to operate on"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene to operate on"
      },
      title: {
        type: "string",
        description: "Title for a project or scene"
      },
      description: {
        type: "string",
        description: "Description for a project or scene"
      },
      content: {
        type: "string",
        description: "Content for a scene (script, image prompt, etc.)"
      },
      contentType: {
        type: "string",
        description: "Type of content being updated (script, imagePrompt, description)",
        enum: ["script", "imagePrompt", "description", "voiceOverText"]
      }
    },
    required: ["action"]
  },
  requiredCredits: 0,
  execute: async (params, context: RunnerContext) => {
    try {
      const canvasService = CanvasService.getInstance();
      const { action } = params;
      
      switch (action) {
        case "listProjects": {
          const projects = await canvasService.getProjects();
          return {
            success: true,
            message: `Found ${projects.length} projects`,
            data: { projects }
          };
        }
        
        case "getProject": {
          const { projectId } = params;
          if (!projectId) {
            return {
              success: false,
              message: "Project ID is required",
              error: "Missing projectId parameter"
            };
          }
          
          const project = await canvasService.getProject(projectId);
          if (!project) {
            return {
              success: false,
              message: `Project ${projectId} not found`,
              error: "Project not found"
            };
          }
          
          return {
            success: true,
            message: `Retrieved project ${project.title}`,
            data: { project }
          };
        }
        
        case "createProject": {
          const { title, description = "" } = params;
          if (!title) {
            return {
              success: false,
              message: "Title is required to create a project",
              error: "Missing title parameter"
            };
          }
          
          const project = await canvasService.createProject(title, description);
          if (!project) {
            return {
              success: false,
              message: "Failed to create project",
              error: "Project creation failed"
            };
          }
          
          return {
            success: true,
            message: `Created project "${title}"`,
            data: { project }
          };
        }
        
        case "updateProject": {
          const { projectId, title, description, content } = params;
          if (!projectId) {
            return {
              success: false,
              message: "Project ID is required",
              error: "Missing projectId parameter"
            };
          }
          
          // If content is provided, it's a full script update
          if (content) {
            const updated = await canvasService.updateProjectScript(projectId, content);
            if (!updated) {
              return {
                success: false,
                message: "Failed to update project script",
                error: "Script update failed"
              };
            }
            
            return {
              success: true,
              message: "Updated project script",
              data: { projectId, scriptSaved: true, scriptContent: content }
            };
          }
          
          // Otherwise update basic project details
          const updateData: any = {};
          if (title) updateData.title = title;
          if (description) updateData.description = description;
          
          if (Object.keys(updateData).length === 0) {
            return {
              success: false,
              message: "No update parameters provided",
              error: "Missing update parameters"
            };
          }
          
          const updated = await canvasService.updateProject(projectId, updateData);
          if (!updated) {
            return {
              success: false,
              message: "Failed to update project",
              error: "Project update failed"
            };
          }
          
          return {
            success: true,
            message: "Project updated successfully",
            data: { projectId, updated: true }
          };
        }
        
        case "listScenes": {
          const { projectId } = params;
          if (!projectId) {
            return {
              success: false,
              message: "Project ID is required",
              error: "Missing projectId parameter"
            };
          }
          
          const scenes = await canvasService.getScenes(projectId);
          return {
            success: true,
            message: `Found ${scenes.length} scenes`,
            data: { scenes }
          };
        }
        
        case "getScene": {
          const { sceneId } = params;
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required",
              error: "Missing sceneId parameter"
            };
          }
          
          const scene = await canvasService.getScene(sceneId);
          if (!scene) {
            return {
              success: false,
              message: `Scene ${sceneId} not found`,
              error: "Scene not found"
            };
          }
          
          return {
            success: true,
            message: `Retrieved scene ${scene.title || scene.id}`,
            data: { scene }
          };
        }
        
        case "createScene": {
          const { projectId, title, content } = params;
          if (!projectId) {
            return {
              success: false,
              message: "Project ID is required",
              error: "Missing projectId parameter"
            };
          }
          
          if (!title) {
            return {
              success: false,
              message: "Title is required to create a scene",
              error: "Missing title parameter"
            };
          }
          
          const sceneData = {
            title,
            script: content || ""
          };
          
          const scene = await canvasService.createScene(projectId, sceneData);
          if (!scene) {
            return {
              success: false,
              message: "Failed to create scene",
              error: "Scene creation failed"
            };
          }
          
          return {
            success: true,
            message: `Created scene "${title}"`,
            data: { scene }
          };
        }
        
        case "updateScene": {
          const { sceneId, content, contentType = "script" } = params;
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required",
              error: "Missing sceneId parameter"
            };
          }
          
          if (!content) {
            return {
              success: false,
              message: "Content is required to update a scene",
              error: "Missing content parameter"
            };
          }
          
          let updated = false;
          switch (contentType) {
            case "script":
              updated = await canvasService.updateSceneScript(sceneId, content);
              break;
            case "imagePrompt":
              updated = await canvasService.updateImagePrompt(sceneId, content);
              break;
            case "description":
              updated = await canvasService.updateSceneDescription(sceneId, content);
              break;
            case "voiceOverText":
              updated = await canvasService.updateScene(sceneId, { voiceOverText: content });
              break;
            default:
              return {
                success: false,
                message: `Invalid contentType "${contentType}"`,
                error: "Invalid contentType"
              };
          }
          
          if (!updated) {
            return {
              success: false,
              message: `Failed to update scene ${contentType}`,
              error: "Scene update failed"
            };
          }
          
          return {
            success: true,
            message: `Updated scene ${contentType}`,
            data: { sceneId, contentType, updated: true }
          };
        }
        
        case "generateImage": {
          const { sceneId, prompt } = params;
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required",
              error: "Missing sceneId parameter"
            };
          }
          
          const result = await canvasService.generateImage({
            sceneId,
            prompt: prompt
          });
          
          if (!result) {
            return {
              success: false,
              message: "Failed to generate image",
              error: "Image generation failed"
            };
          }
          
          return {
            success: true,
            message: "Image generation started",
            data: { sceneId, imageGenerationStarted: true }
          };
        }
        
        case "generateVideo": {
          const { sceneId, aspectRatio = "16:9" } = params;
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required",
              error: "Missing sceneId parameter"
            };
          }
          
          const result = await canvasService.generateVideo({
            sceneId,
            aspectRatio
          });
          
          if (!result) {
            return {
              success: false,
              message: "Failed to generate video",
              error: "Video generation failed"
            };
          }
          
          return {
            success: true,
            message: "Video generation started",
            data: { sceneId, videoGenerationStarted: true }
          };
        }
        
        default:
          return {
            success: false,
            message: `Unknown action "${action}"`,
            error: "Invalid action"
          };
      }
    } catch (error) {
      console.error("Error in Canvas tool:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};
