
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";

interface CanvasToolParameters {
  action: "update_script" | "update_image_prompt" | "update_description" | "generate_full_script" | "divide_script" | "get_project_info";
  projectId: string;
  sceneId?: string;
  content?: string;
  scenesContent?: Array<{id: string, content: string}>;
}

export const canvasTool: ToolDefinition = {
  name: "canvas",
  description: "Update or retrieve information from Canvas video projects. Use this to work with scripts, image prompts, and scene descriptions.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["update_script", "update_image_prompt", "update_description", "generate_full_script", "divide_script", "get_project_info"],
        description: "The action to perform on the Canvas project"
      },
      projectId: {
        type: "string",
        description: "ID of the canvas project to update"
      },
      sceneId: {
        type: "string",
        description: "ID of the scene to update (required for scene-specific actions)"
      },
      content: {
        type: "string",
        description: "Content to update (for single content updates)"
      },
      scenesContent: {
        type: "array",
        description: "Array of scene content updates (for divide_script action)",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of the scene"
            },
            content: {
              type: "string",
              description: "Content for the scene"
            }
          }
        }
      }
    },
    required: ["action", "projectId"]
  },
  requiredCredits: 0,
  
  async execute(params: CanvasToolParameters, context: ToolContext): Promise<ToolExecutionResult> {
    try {
      console.log("Executing canvas tool with params:", params);
      
      // Get Supabase client from context
      const { supabase } = context;
      
      switch (params.action) {
        case "update_script":
        case "update_image_prompt":
        case "update_description": {
          // Validate required parameters
          if (!params.sceneId || !params.content) {
            return {
              success: false,
              error: `Missing required parameters for ${params.action}: sceneId and content are required`
            };
          }
          
          // Map action to scene update type
          const updateTypeMap: Record<string, SceneUpdateType> = {
            "update_script": "script",
            "update_image_prompt": "imagePrompt",
            "update_description": "description"
          };
          
          const updateType = updateTypeMap[params.action];
          
          // Convert field names to database column names
          const fieldMap: Record<SceneUpdateType, string> = {
            script: 'script',
            description: 'description',
            imagePrompt: 'image_prompt',
            image: 'image_url',
            productImage: 'product_image_url',
            video: 'video_url',
            voiceOver: 'voice_over_url',
            backgroundMusic: 'background_music_url'
          };
          
          const dbField = fieldMap[updateType];
          
          // Update the scene in the database
          const { error } = await supabase
            .from('canvas_scenes')
            .update({ [dbField]: params.content })
            .eq('id', params.sceneId)
            .eq('project_id', params.projectId);
          
          if (error) {
            console.error(`Error updating scene ${updateType}:`, error);
            return {
              success: false,
              error: `Failed to update scene ${updateType}: ${error.message}`
            };
          }
          
          return {
            success: true,
            data: {
              message: `Successfully updated scene ${updateType}`,
              sceneId: params.sceneId,
              type: updateType
            }
          };
        }
          
        case "generate_full_script": {
          // Validate content
          if (!params.content) {
            return {
              success: false,
              error: "Missing required parameter: content is required for generate_full_script"
            };
          }
          
          // Update the project full script
          const { error } = await supabase
            .from('canvas_projects')
            .update({ full_script: params.content })
            .eq('id', params.projectId);
          
          if (error) {
            console.error("Error updating full script:", error);
            return {
              success: false,
              error: `Failed to update full script: ${error.message}`
            };
          }
          
          return {
            success: true,
            data: {
              message: "Successfully updated full script for the project",
              projectId: params.projectId
            }
          };
        }
        
        case "divide_script": {
          // Validate scenes content
          if (!params.scenesContent || !Array.isArray(params.scenesContent) || params.scenesContent.length === 0) {
            return {
              success: false,
              error: "Missing or invalid scenesContent. Expected array of scene content updates."
            };
          }
          
          // Update each scene script
          const results = [];
          let hasError = false;
          
          for (const scene of params.scenesContent) {
            if (!scene.id || !scene.content) {
              results.push({
                success: false,
                error: "Missing id or content in scene update",
                scene: scene
              });
              hasError = true;
              continue;
            }
            
            const { error } = await supabase
              .from('canvas_scenes')
              .update({ script: scene.content })
              .eq('id', scene.id)
              .eq('project_id', params.projectId);
            
            if (error) {
              results.push({
                success: false,
                error: error.message,
                sceneId: scene.id
              });
              hasError = true;
            } else {
              results.push({
                success: true,
                sceneId: scene.id
              });
            }
          }
          
          return {
            success: !hasError,
            data: {
              message: hasError ? "Some scene updates failed" : "Successfully divided script across scenes",
              results: results
            }
          };
        }
        
        case "get_project_info": {
          // Get project data
          const { data: projectData, error: projectError } = await supabase
            .from('canvas_projects')
            .select('*')
            .eq('id', params.projectId)
            .single();
          
          if (projectError) {
            console.error("Error fetching project:", projectError);
            return {
              success: false,
              error: `Failed to fetch project: ${projectError.message}`
            };
          }
          
          // Get scenes for the project
          const { data: scenesData, error: scenesError } = await supabase
            .from('canvas_scenes')
            .select(`
              id, project_id, title, scene_order, script, description, 
              image_prompt, image_url, product_image_url, video_url, 
              voice_over_url, background_music_url, duration, created_at, updated_at
            `)
            .eq('project_id', params.projectId)
            .order('scene_order', { ascending: true });
          
          if (scenesError) {
            console.error("Error fetching scenes:", scenesError);
            return {
              success: false,
              error: `Failed to fetch scenes: ${scenesError.message}`
            };
          }
          
          // Format the response
          const formattedScenes = scenesData.map(scene => ({
            id: scene.id,
            title: scene.title,
            order: scene.scene_order,
            script: scene.script || "",
            description: scene.description || "",
            imagePrompt: scene.image_prompt || "",
            hasImage: !!scene.image_url,
            hasVideo: !!scene.video_url,
            duration: scene.duration
          }));
          
          return {
            success: true,
            data: {
              project: {
                id: projectData.id,
                title: projectData.title,
                description: projectData.description || "",
                fullScript: projectData.full_script || "",
                sceneCount: formattedScenes.length
              },
              scenes: formattedScenes
            }
          };
        }
        
        default:
          return {
            success: false,
            error: `Unknown action: ${params.action}`
          };
      }
    } catch (error: any) {
      console.error("Error executing canvas tool:", error);
      return {
        success: false,
        error: `Canvas tool execution error: ${error.message}`
      };
    }
  }
};
