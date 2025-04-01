
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { CommandExecutionState } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene } from "@/types/canvas";

export const canvasProjectTool: ToolDefinition = {
  name: "canvas_project",
  description: "View, create, edit or delete Canvas video projects and scenes",
  requiredCredits: 0,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "listProjects", 
          "getProject", 
          "createProject", 
          "updateProject", 
          "deleteProject",
          "listScenes",
          "getScene",
          "createScene",
          "updateScene",
          "deleteScene"
        ],
        description: "The action to perform on Canvas projects"
      },
      projectId: {
        type: "string",
        description: "The ID of the project (required for most operations except listProjects and createProject)"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene (required for getScene, updateScene, deleteScene)"
      },
      title: {
        type: "string",
        description: "Title for create/update operations"
      },
      description: {
        type: "string",
        description: "Description for create/update operations"
      },
      script: {
        type: "string",
        description: "Script content for scene operations"
      },
      imagePrompt: {
        type: "string",
        description: "Image prompt for scene operations"
      },
      fullScript: {
        type: "string",
        description: "Full script content for project operations"
      }
    },
    required: ["action"]
  },
  
  metadata: {
    category: "canvas",
    displayName: "Canvas Project Tool",
    icon: "video"
  },
  
  execute: async (params, context): Promise<ToolExecutionResult> => {
    try {
      const { action } = params;
      
      // Ensure user is authenticated for all operations
      if (!context.userId) {
        return {
          success: false,
          message: "Authentication required to manage Canvas projects",
          error: "User not authenticated",
          state: CommandExecutionState.FAILED
        };
      }
      
      switch (action) {
        // PROJECT OPERATIONS
        case "listProjects": {
          const { data: projects, error } = await supabase
            .from('canvas_projects')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) {
            return {
              success: false,
              message: `Failed to list projects: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: `Found ${projects.length} projects`,
            data: projects,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "getProject": {
          const { projectId } = params;
          
          if (!projectId) {
            return {
              success: false,
              message: "projectId is required for getProject action",
              error: "Missing projectId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Get project with scenes
          const { data: project, error: projectError } = await supabase
            .from('canvas_projects')
            .select('*')
            .eq('id', projectId)
            .single();
            
          if (projectError) {
            return {
              success: false,
              message: `Failed to get project: ${projectError.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          // Get scenes for this project
          const { data: scenes, error: scenesError } = await supabase
            .from('canvas_scenes')
            .select('*')
            .eq('project_id', projectId)
            .order('scene_order', { ascending: true });
            
          if (scenesError) {
            return {
              success: false,
              message: `Failed to get project scenes: ${scenesError.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Project details retrieved successfully",
            data: {
              project,
              scenes: scenes || []
            },
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "createProject": {
          const { title, description, fullScript } = params;
          
          if (!title) {
            return {
              success: false,
              message: "title is required for createProject action",
              error: "Missing title parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Create new project
          const { data: newProject, error } = await supabase
            .from('canvas_projects')
            .insert([{
              title,
              description: description || '',
              full_script: fullScript || '',
              user_id: context.userId
            }])
            .select()
            .single();
            
          if (error) {
            return {
              success: false,
              message: `Failed to create project: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Project created successfully",
            data: newProject,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "updateProject": {
          const { projectId, title, description, fullScript } = params;
          
          if (!projectId) {
            return {
              success: false,
              message: "projectId is required for updateProject action",
              error: "Missing projectId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Build update object with only provided fields
          const updateData: Partial<CanvasProject> = {};
          if (title !== undefined) updateData.title = title;
          if (description !== undefined) updateData.description = description;
          if (fullScript !== undefined) updateData.full_script = fullScript;
          
          // Update project
          const { data: updatedProject, error } = await supabase
            .from('canvas_projects')
            .update(updateData)
            .eq('id', projectId)
            .select()
            .single();
            
          if (error) {
            return {
              success: false,
              message: `Failed to update project: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Project updated successfully",
            data: updatedProject,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "deleteProject": {
          const { projectId } = params;
          
          if (!projectId) {
            return {
              success: false,
              message: "projectId is required for deleteProject action",
              error: "Missing projectId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // First delete all scenes to avoid foreign key constraints
          const { error: scenesDeleteError } = await supabase
            .from('canvas_scenes')
            .delete()
            .eq('project_id', projectId);
            
          if (scenesDeleteError) {
            return {
              success: false,
              message: `Failed to delete project scenes: ${scenesDeleteError.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          // Delete the project
          const { error } = await supabase
            .from('canvas_projects')
            .delete()
            .eq('id', projectId);
            
          if (error) {
            return {
              success: false,
              message: `Failed to delete project: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Project and all associated scenes deleted successfully",
            state: CommandExecutionState.COMPLETED
          };
        }
        
        // SCENE OPERATIONS
        case "listScenes": {
          const { projectId } = params;
          
          if (!projectId) {
            return {
              success: false,
              message: "projectId is required for listScenes action",
              error: "Missing projectId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          const { data: scenes, error } = await supabase
            .from('canvas_scenes')
            .select('*')
            .eq('project_id', projectId)
            .order('scene_order', { ascending: true });
            
          if (error) {
            return {
              success: false,
              message: `Failed to list scenes: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: `Found ${scenes.length} scenes for project`,
            data: scenes,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "getScene": {
          const { sceneId } = params;
          
          if (!sceneId) {
            return {
              success: false,
              message: "sceneId is required for getScene action",
              error: "Missing sceneId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          const { data: scene, error } = await supabase
            .from('canvas_scenes')
            .select('*')
            .eq('id', sceneId)
            .single();
            
          if (error) {
            return {
              success: false,
              message: `Failed to get scene: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Scene details retrieved successfully",
            data: scene,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "createScene": {
          const { projectId, title, script, imagePrompt } = params;
          
          if (!projectId) {
            return {
              success: false,
              message: "projectId is required for createScene action",
              error: "Missing projectId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Get count of existing scenes to set order
          const { data: existingScenes, error: countError } = await supabase
            .from('canvas_scenes')
            .select('id')
            .eq('project_id', projectId);
            
          if (countError) {
            return {
              success: false,
              message: `Failed to count existing scenes: ${countError.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          const sceneOrder = (existingScenes?.length || 0) + 1;
          
          // Create new scene
          const { data: newScene, error } = await supabase
            .from('canvas_scenes')
            .insert([{
              project_id: projectId,
              title: title || `Scene ${sceneOrder}`,
              scene_order: sceneOrder,
              script: script || '',
              image_prompt: imagePrompt || ''
            }])
            .select()
            .single();
            
          if (error) {
            return {
              success: false,
              message: `Failed to create scene: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Scene created successfully",
            data: newScene,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "updateScene": {
          const { sceneId, title, script, imagePrompt, description } = params;
          
          if (!sceneId) {
            return {
              success: false,
              message: "sceneId is required for updateScene action",
              error: "Missing sceneId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Build update object with only provided fields
          const updateData: Partial<CanvasScene> = {};
          if (title !== undefined) updateData.title = title;
          if (script !== undefined) updateData.script = script;
          if (imagePrompt !== undefined) updateData.image_prompt = imagePrompt;
          if (description !== undefined) updateData.description = description;
          
          // Update scene
          const { data: updatedScene, error } = await supabase
            .from('canvas_scenes')
            .update(updateData)
            .eq('id', sceneId)
            .select()
            .single();
            
          if (error) {
            return {
              success: false,
              message: `Failed to update scene: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Scene updated successfully",
            data: updatedScene,
            state: CommandExecutionState.COMPLETED
          };
        }
        
        case "deleteScene": {
          const { sceneId } = params;
          
          if (!sceneId) {
            return {
              success: false,
              message: "sceneId is required for deleteScene action",
              error: "Missing sceneId parameter",
              state: CommandExecutionState.FAILED
            };
          }
          
          // Delete the scene
          const { error } = await supabase
            .from('canvas_scenes')
            .delete()
            .eq('id', sceneId);
            
          if (error) {
            return {
              success: false,
              message: `Failed to delete scene: ${error.message}`,
              state: CommandExecutionState.FAILED
            };
          }
          
          return {
            success: true,
            message: "Scene deleted successfully",
            state: CommandExecutionState.COMPLETED
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
      console.error("Canvas project tool error:", error);
      return {
        success: false,
        message: `Canvas project operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        state: CommandExecutionState.FAILED
      };
    }
  }
};
