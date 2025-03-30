
import { supabase } from "@/integrations/supabase/client";
import { getSceneById, getScenesByProjectId, extractSceneContent } from "@/utils/canvas-data-utils";

export const canvasDataTool = {
  name: "canvas_data",
  description: "Retrieve and analyze data from Canvas projects and scenes",
  version: "1.0",
  requiredCredits: 0.1,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["getProject", "getScene", "getScenes", "searchScenes", "analyzeContent"],
        description: "The action to perform with the Canvas data"
      },
      projectId: {
        type: "string",
        description: "The ID of the project to operate on"
      },
      sceneId: {
        type: "string",
        description: "The ID of the scene to get or analyze (for scene-specific actions)"
      },
      query: {
        type: "string",
        description: "Search query or analysis prompt"
      },
      contentType: {
        type: "string",
        enum: ["script", "imagePrompt", "description", "voiceOverText", "all"],
        description: "The type of content to retrieve or analyze"
      }
    },
    required: ["action", "projectId"]
  },
  
  execute: async (params, context) => {
    try {
      const { action, projectId, sceneId, query, contentType = "all" } = params;
      
      switch (action) {
        case "getProject": {
          // Get project data including scenes
          const { data: project, error: projectError } = await supabase
            .from("canvas_projects")
            .select("*")
            .eq("id", projectId)
            .single();
            
          if (projectError) {
            throw new Error(`Error fetching project: ${projectError.message}`);
          }
          
          const scenes = await getScenesByProjectId(projectId);
          
          return {
            success: true,
            message: "Project data retrieved",
            data: {
              project,
              scenes
            }
          };
        }
          
        case "getScene": {
          if (!sceneId) {
            return {
              success: false,
              message: "Scene ID is required for getScene action",
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
            message: "Scene data retrieved",
            data: scene
          };
        }
          
        case "getScenes": {
          const scenes = await getScenesByProjectId(projectId);
          
          return {
            success: true,
            message: `Retrieved ${scenes.length} scenes for project`,
            data: scenes
          };
        }
          
        case "searchScenes": {
          if (!query) {
            return {
              success: false,
              message: "Search query is required for searchScenes action",
              data: null
            };
          }
          
          const scenes = await getScenesByProjectId(projectId);
          
          // Simple search implementation - in a real app, this would be more sophisticated
          const matchingScenes = scenes.filter(scene => {
            const content = extractSceneContent(scene, contentType as any);
            return content.toLowerCase().includes(query.toLowerCase());
          });
          
          return {
            success: true,
            message: `Found ${matchingScenes.length} scenes matching query: "${query}"`,
            data: matchingScenes
          };
        }
          
        case "analyzeContent": {
          if (!query) {
            return {
              success: false,
              message: "Analysis query is required for analyzeContent action",
              data: null
            };
          }
          
          // For an actual implementation, this might call an LLM to analyze the content
          // For now, we're just returning the content with the query
          let contentToAnalyze = "";
          
          if (sceneId) {
            const scene = await getSceneById(sceneId);
            if (scene) {
              contentToAnalyze = extractSceneContent(scene, contentType as any);
            }
          } else {
            const scenes = await getScenesByProjectId(projectId);
            contentToAnalyze = scenes.map(scene => 
              `Scene ${scene.order}: ${scene.title}\n${extractSceneContent(scene, contentType as any)}`
            ).join("\n\n");
          }
          
          return {
            success: true,
            message: `Content analyzed based on query: "${query}"`,
            data: {
              query,
              contentType,
              content: contentToAnalyze,
              analysis: `This is where AI analysis of the content would go, based on: "${query}"`
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
