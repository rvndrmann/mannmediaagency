
import { supabase } from "@/integrations/supabase/client";
import { CanvasService } from "@/services/canvas/CanvasService";
import { MCPService } from "@/services/mcp/MCPService";
import { IntegrationService } from "@/services/integration/IntegrationService";

export const canvasTool = {
  name: "canvas",
  description: "Create and update video scenes in the Canvas system",
  version: "2.0",
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
  
  execute: async (params, context) => {
    try {
      const { action, projectId, sceneId, content, useMcp = true, productShotVersion, aspectRatio } = params;
      
      // Get services
      const canvasService = CanvasService.getInstance();
      const integrationService = IntegrationService.getInstance();
      
      // Try to initialize MCP for this project if requested
      if (useMcp) {
        await integrationService.initMcpForProject(projectId);
      }
      
      // Handle different actions using the service layer
      switch (action) {
        case "updateDescription": {
          if (!sceneId) {
            throw new Error("sceneId is required for updateDescription action");
          }
          
          // Update scene description
          const success = await canvasService.updateSceneDescription(sceneId, useMcp);
          
          return {
            success,
            message: success ? 
              "Scene description updated successfully" : 
              "Failed to update scene description",
            data: { sceneId }
          };
        }
        
        case "generateImagePrompt": {
          if (!sceneId) {
            throw new Error("sceneId is required for generateImagePrompt action");
          }
          
          // Update image prompt
          const success = await canvasService.updateImagePrompt(sceneId, useMcp);
          
          return {
            success,
            message: success ? 
              "Image prompt generated successfully" : 
              "Failed to generate image prompt",
            data: { sceneId }
          };
        }
        
        case "generateImage": {
          if (!sceneId) {
            throw new Error("sceneId is required for generateImage action");
          }
          
          // Generate image
          const success = await canvasService.generateImage({
            sceneId,
            prompt: content,
            version: productShotVersion
          }, useMcp);
          
          return {
            success,
            message: success ? 
              "Scene image generated successfully" : 
              "Failed to generate scene image",
            data: { sceneId }
          };
        }
        
        case "generateVideo": {
          if (!sceneId) {
            throw new Error("sceneId is required for generateVideo action");
          }
          
          // Generate video
          const success = await canvasService.generateVideo({
            sceneId,
            aspectRatio
          }, useMcp);
          
          return {
            success,
            message: success ? 
              "Scene video generated successfully" : 
              "Failed to generate scene video",
            data: { sceneId }
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
            data: scene ? { sceneId: scene.id } : null
          };
        }
        
        case "updateScene": {
          if (!sceneId) {
            throw new Error("sceneId is required for updateScene action");
          }
          
          // Update scene script
          const success = await canvasService.updateScene(sceneId, {
            script: content
          });
          
          // If the content looks like a script, save it as the full script too
          if (success && content && isScriptContent(content)) {
            try {
              // Since this is just a custom function and not part of our core functionality,
              // we'll use Supabase directly for this update
              await supabase
                .from('canvas_projects')
                .update({ full_script: content })
                .eq('id', projectId);
              
              return {
                success: true,
                message: "Scene and project script updated",
                data: { 
                  sceneId,
                  scriptSaved: true,
                  scriptContent: content
                }
              };
            } catch (err) {
              console.error("Error saving as full script:", err);
            }
          }
          
          return {
            success,
            message: success ? "Scene updated" : "Failed to update scene",
            data: { sceneId }
          };
        }
        
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error("Canvas tool error:", error);
      return {
        success: false,
        message: `Canvas operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }
};

// Helper function to detect if content looks like a script
function isScriptContent(content: string): boolean {
  // Check for script markers
  const scriptMarkers = [
    /SCENE \d+/i,
    /\bINT\.\s/i,
    /\bEXT\.\s/i,
    /FADE (IN|OUT)/i,
    /CUT TO:/i,
    /TITLE:/i,
    /CLOSE UP/i,
    /WIDE SHOT/i,
    /NARRATOR:/i,
    /\bVO:/i,
    /VOICE OVER:/i,
    /\bV\.O\./i,
    /\(beat\)/i,
    /DISSOLVE TO:/i,
    /FADE TO BLACK/i
  ];
  
  // Check if content matches any script markers
  for (const marker of scriptMarkers) {
    if (marker.test(content)) {
      return true;
    }
  }
  
  // Check for script-like structure (multiple paragraphs)
  if (content.includes('\n\n')) {
    const paragraphs = content.split('\n\n');
    if (paragraphs.length >= 3) {
      return true;
    }
  }
  
  return false;
}
