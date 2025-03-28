import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";

interface CanvasToolParameters {
  action: "update_script" | "update_image_prompt" | "update_description" | "update_voice_over_text" | "generate_full_script" | "divide_script" | "get_project_info" | "generate_image_prompts";
  projectId: string;
  sceneId?: string;
  content?: string;
  scenesContent?: Array<{id: string, content: string, voiceOverText?: string}>;
  sceneIds?: string[];
}

export const canvasTool: ToolDefinition = {
  name: "canvas",
  description: "Update or retrieve information from Canvas video projects. Use this to work with scripts, image prompts, voice-over text, and scene descriptions.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["update_script", "update_image_prompt", "update_description", "update_voice_over_text", "generate_full_script", "divide_script", "get_project_info", "generate_image_prompts"],
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
            },
            voiceOverText: {
              type: "string",
              description: "Voice-over text for the scene (clean text with no directions)"
            }
          }
        }
      },
      sceneIds: {
        type: "array",
        description: "Array of scene IDs (for generate_image_prompts action)",
        items: {
          type: "string"
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
        case "update_description":
        case "update_voice_over_text": {
          // Validate required parameters
          if (!params.sceneId || !params.content) {
            return {
              success: false,
              error: `Missing required parameters for ${params.action}: sceneId and content are required`
            };
          }
          
          // Map action to scene update type
          const updateTypeMap: Record<string, string> = {
            "update_script": "script",
            "update_image_prompt": "image_prompt",
            "update_description": "description",
            "update_voice_over_text": "voice_over_text"
          };
          
          const updateType = updateTypeMap[params.action];
          
          // Update the scene in the database
          const { error } = await supabase
            .from('canvas_scenes')
            .update({ [updateType]: params.content })
            .eq('id', params.sceneId)
            .eq('project_id', params.projectId);
          
          if (error) {
            console.error(`Error updating scene ${updateType}:`, error);
            return {
              success: false,
              error: `Failed to update scene ${updateType}: ${error.message}`
            };
          }
          
          // If updating script, also extract and update voice-over text if not provided
          if (params.action === "update_script" && !params.sceneId.includes("voice_over_text")) {
            // Extract voice-over text from script content
            const voiceOverText = extractVoiceOverText(params.content);
            
            // Update voice-over text
            await supabase
              .from('canvas_scenes')
              .update({ voice_over_text: voiceOverText })
              .eq('id', params.sceneId)
              .eq('project_id', params.projectId);
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
            
            // Prepare update data
            const updateData: { script: string; voice_over_text?: string } = {
              script: scene.content
            };
            
            // Add voice-over text if provided, otherwise extract it
            if (scene.voiceOverText) {
              updateData.voice_over_text = scene.voiceOverText;
            } else {
              // Extract voice-over text from content
              updateData.voice_over_text = extractVoiceOverText(scene.content);
            }
            
            const { error } = await supabase
              .from('canvas_scenes')
              .update(updateData)
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
              image_prompt, voice_over_text, image_url, product_image_url, video_url, 
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
          
          // Ensure we have valid data (even if it's an error, try to provide a safer response)
          const scenesList = Array.isArray(scenesData) ? scenesData : [];
          
          // Format the response
          const formattedScenes = scenesList.map(scene => ({
            id: scene.id,
            title: scene.title,
            order: scene.scene_order,
            script: scene.script || "",
            description: scene.description || "",
            imagePrompt: scene.image_prompt || "",
            voiceOverText: scene.voice_over_text || "",
            hasImage: !!scene.image_url,
            hasVideo: !!scene.video_url,
            hasVoiceOver: !!scene.voice_over_url,
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
        
        case "generate_image_prompts": {
          // Validate required parameters
          if (!params.projectId) {
            return {
              success: false,
              error: "Missing required parameters: projectId is required"
            };
          }
          
          // Get scene IDs if not provided
          let sceneIds = params.sceneIds;
          
          if (!sceneIds || sceneIds.length === 0) {
            // Get all scenes with voice-over text but no image prompt
            const { data: scenes, error: scenesError } = await supabase
              .from('canvas_scenes')
              .select('id')
              .eq('project_id', params.projectId)
              .is('image_prompt', null)
              .not('voice_over_text', 'is', null);
            
            if (scenesError) {
              console.error("Error fetching scenes:", scenesError);
              return {
                success: false,
                error: `Failed to fetch scenes: ${scenesError.message}`
              };
            }
            
            sceneIds = scenes.map(scene => scene.id);
            
            if (sceneIds.length === 0) {
              return {
                success: false,
                error: "No scenes found with voice-over text but without image prompts"
              };
            }
          }
          
          // Call the Supabase Edge Function to generate image prompts
          const { data, error } = await supabase.functions.invoke('generate-image-prompts', {
            body: { 
              sceneIds: sceneIds,
              projectId: params.projectId
            }
          });
          
          if (error) {
            console.error("Error generating image prompts:", error);
            return {
              success: false,
              error: `Failed to generate image prompts: ${error.message}`
            };
          }
          
          return {
            success: true,
            data: {
              message: `Generated image prompts for ${data.successfulScenes} out of ${data.processedScenes} scenes`,
              results: data.results
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

// Helper function to extract clean voice-over text from script content
function extractVoiceOverText(content: string): string {
  // Strip any bracketed direction text [like this]
  let voiceOverText = content.replace(/\[.*?\]/g, '');
  
  // Remove any narrator directions in parentheses (like this)
  voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
  
  // Remove any lines that start with common direction markers
  const lines = voiceOverText.split('\n').filter(line => {
    const trimmedLine = line.trim();
    return !trimmedLine.startsWith('SCENE') &&
           !trimmedLine.startsWith('CUT TO:') &&
           !trimmedLine.startsWith('FADE') &&
           !trimmedLine.startsWith('INT.') &&
           !trimmedLine.startsWith('EXT.') &&
           !trimmedLine.startsWith('TRANSITION');
  });
  
  // Clean up any double spaces or excess whitespace
  return lines.join('\n').replace(/\s+/g, ' ').trim();
}
