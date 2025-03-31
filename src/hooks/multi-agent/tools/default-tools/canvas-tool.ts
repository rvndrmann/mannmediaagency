
import { ToolDefinition } from "../../runner/types";
import { CanvasService } from "@/services/canvas/CanvasService";
import { toast } from "sonner";

// Create a new instance of the Canvas Service
const canvasService = new CanvasService();

export const canvasTool: ToolDefinition = {
  name: "canvas_tool",
  description: "Tool for interacting with Canvas projects and scenes",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "list_projects",
          "get_project",
          "create_project",
          "update_project",
          "delete_project",
          "list_scenes",
          "get_scene",
          "create_scene",
          "update_scene",
          "delete_scene",
          "update_scene_script",
          "update_scene_description",
          "update_project_script",
        ],
        description: "The action to perform on Canvas projects or scenes"
      },
      projectId: {
        type: "string",
        description: "The ID of the project (required for most actions except create_project and list_projects)"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene (required for scene-specific actions)"
      },
      title: {
        type: "string",
        description: "The title for a project or scene"
      },
      description: {
        type: "string",
        description: "The description for a project or scene"
      },
      script: {
        type: "string",
        description: "The script for a scene or project"
      },
      imagePrompt: {
        type: "string",
        description: "The image prompt for a scene"
      }
    },
    required: ["action"]
  },
  metadata: {
    category: "canvas",
    requiredPermissions: ["canvas:read", "canvas:write"],
    version: "1.0.0"
  },
  requiredCredits: 0,
  execute: async (params, context) => {
    try {
      const { action } = params;
      
      // Validate context and user
      if (!context || !context.userId) {
        return {
          success: false,
          message: "User authentication required for canvas operations",
          error: "Missing user context"
        };
      }

      // Execute the requested action
      switch (action) {
        case "list_projects":
          const projects = await canvasService.getProjects();
          return {
            success: true,
            message: `Retrieved ${projects.length} projects`,
            data: projects
          };
          
        case "get_project":
          if (!params.projectId) {
            return { 
              success: false, 
              message: "Project ID is required", 
              error: "Missing projectId parameter" 
            };
          }
          
          const project = await canvasService.getProject(params.projectId);
          if (!project) {
            return {
              success: false,
              message: `Project with ID ${params.projectId} not found`,
              error: "Project not found"
            };
          }
          
          return {
            success: true,
            message: `Retrieved project: ${project.title}`,
            data: project
          };
          
        case "create_project":
          if (!params.title) {
            return { 
              success: false, 
              message: "Project title is required", 
              error: "Missing title parameter" 
            };
          }
          
          const newProject = await canvasService.createProject({
            title: params.title,
            description: params.description || "",
            userId: context.userId,
            fullScript: params.script || ""
          });
          
          return {
            success: true,
            message: `Created new project: ${newProject.title}`,
            data: newProject
          };
          
        case "update_project":
          if (!params.projectId) {
            return { 
              success: false, 
              message: "Project ID is required", 
              error: "Missing projectId parameter" 
            };
          }
          
          const updatedProject = await canvasService.updateProject(params.projectId, {
            title: params.title,
            description: params.description,
            fullScript: params.script
          });
          
          return {
            success: true,
            message: `Updated project: ${updatedProject.title}`,
            data: updatedProject
          };
          
        case "update_project_script":
          if (!params.projectId || !params.script) {
            return { 
              success: false, 
              message: "Project ID and script are required", 
              error: "Missing required parameters" 
            };
          }
          
          const scriptUpdatedProject = await canvasService.updateProject(params.projectId, {
            fullScript: params.script
          });
          
          return {
            success: true,
            message: `Updated project script for: ${scriptUpdatedProject.title}`,
            data: scriptUpdatedProject
          };
          
        case "delete_project":
          if (!params.projectId) {
            return { 
              success: false, 
              message: "Project ID is required", 
              error: "Missing projectId parameter" 
            };
          }
          
          await canvasService.deleteProject(params.projectId);
          return {
            success: true,
            message: `Deleted project with ID: ${params.projectId}`
          };
          
        case "list_scenes":
          if (!params.projectId) {
            return { 
              success: false, 
              message: "Project ID is required", 
              error: "Missing projectId parameter" 
            };
          }
          
          const scenes = await canvasService.getScenes(params.projectId);
          return {
            success: true,
            message: `Retrieved ${scenes.length} scenes for project`,
            data: scenes
          };
          
        case "get_scene":
          if (!params.projectId || !params.sceneId) {
            return { 
              success: false, 
              message: "Project ID and Scene ID are required", 
              error: "Missing required parameters" 
            };
          }
          
          const scene = await canvasService.getScenes(params.projectId)
            .then(scenes => scenes.find(s => s.id === params.sceneId));
            
          if (!scene) {
            return {
              success: false,
              message: `Scene with ID ${params.sceneId} not found`,
              error: "Scene not found"
            };
          }
          
          return {
            success: true,
            message: `Retrieved scene: ${scene.id}`,
            data: scene
          };
          
        case "create_scene":
          if (!params.projectId || !params.title) {
            return { 
              success: false, 
              message: "Project ID and title are required", 
              error: "Missing required parameters" 
            };
          }
          
          const newScene = await canvasService.createScene(params.projectId, {
            title: params.title,
            description: params.description || "",
            script: params.script || ""
          });
          
          return {
            success: true,
            message: `Created new scene: ${newScene.title}`,
            data: newScene
          };
          
        case "update_scene":
          if (!params.projectId || !params.sceneId) {
            return { 
              success: false, 
              message: "Project ID and Scene ID are required", 
              error: "Missing required parameters" 
            };
          }
          
          const updatedScene = await canvasService.updateScene(params.projectId, params.sceneId, {
            title: params.title,
            description: params.description,
            script: params.script,
            imagePrompt: params.imagePrompt
          });
          
          return {
            success: true,
            message: `Updated scene: ${updatedScene.title || updatedScene.id}`,
            data: updatedScene
          };
          
        case "update_scene_script":
          if (!params.projectId || !params.sceneId || !params.script) {
            return { 
              success: false, 
              message: "Project ID, Scene ID, and script are required", 
              error: "Missing required parameters" 
            };
          }
          
          const scriptUpdatedScene = await canvasService.updateScene(params.projectId, params.sceneId, {
            script: params.script
          });
          
          return {
            success: true,
            message: `Updated script for scene: ${scriptUpdatedScene.title || scriptUpdatedScene.id}`,
            data: scriptUpdatedScene
          };
          
        case "update_scene_description":
          if (!params.projectId || !params.sceneId || !params.description) {
            return { 
              success: false, 
              message: "Project ID, Scene ID, and description are required", 
              error: "Missing required parameters" 
            };
          }
          
          const descriptionUpdatedScene = await canvasService.updateScene(params.projectId, params.sceneId, {
            description: params.description
          });
          
          return {
            success: true,
            message: `Updated description for scene: ${descriptionUpdatedScene.title || descriptionUpdatedScene.id}`,
            data: descriptionUpdatedScene
          };
          
        case "delete_scene":
          if (!params.projectId || !params.sceneId) {
            return { 
              success: false, 
              message: "Project ID and Scene ID are required", 
              error: "Missing required parameters" 
            };
          }
          
          await canvasService.deleteScene(params.projectId, params.sceneId);
          return {
            success: true,
            message: `Deleted scene with ID: ${params.sceneId}`
          };
          
        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
            error: "Invalid action"
          };
      }
      
    } catch (error) {
      console.error("Canvas tool error:", error);
      
      // Show toast notification for user feedback
      toast.error(`Canvas operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        message: `Canvas operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
