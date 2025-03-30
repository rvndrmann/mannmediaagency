
import { supabase } from "@/integrations/supabase/client";
import { MCPServerService } from "@/services/mcpService";

interface MCPToolParams {
  sceneId: string;
  imageAnalysis?: boolean;
  useDescription?: boolean;
  productShotVersion?: string;
  aspectRatio?: string;
}

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
      
      // Default to MCP execution if not explicitly disabled
      if (useMcp !== false) {
        // Create a new MCP server connection
        const mcpServer = new MCPServerService(`https://api.browser-use.com/api/v1/mcp/${projectId}`, projectId);
        
        try {
          await mcpServer.connect();
          
          let toolName = "";
          let toolParams: MCPToolParams = { sceneId: sceneId as string };
          
          switch (action) {
            case "updateDescription":
              toolName = "update_scene_description";
              toolParams = { 
                ...toolParams, 
                imageAnalysis: true 
              };
              break;
            case "generateImagePrompt":
              toolName = "update_image_prompt";
              toolParams = { 
                ...toolParams, 
                useDescription: true 
              };
              break;
            case "generateImage":
              toolName = "generate_scene_image";
              toolParams = { 
                ...toolParams, 
                productShotVersion: productShotVersion || "v2" 
              };
              break;
            case "generateVideo":
              toolName = "create_scene_video";
              toolParams = { 
                ...toolParams, 
                aspectRatio: aspectRatio || "16:9" 
              };
              break;
            default:
              throw new Error(`Unsupported MCP action: ${action}`);
          }
          
          const result = await mcpServer.callTool(toolName, toolParams);
          await mcpServer.cleanup();
          
          return {
            success: result.success !== false,
            message: result.result || "Operation completed via MCP",
            data: result
          };
        } catch (error) {
          console.error(`MCP execution failed, falling back to legacy execution:`, error);
          // Continue to legacy execution if MCP fails
        }
      }
      
      // Legacy execution (without MCP)
      switch (action) {
        case "updateDescription":
        case "generateImagePrompt": {
          const type = action === "updateDescription" ? "description" : "imagePrompt";
          const { data, error } = await supabase.functions.invoke("canvas-scene-agent", {
            body: {
              sceneId,
              prompt: content,
              type,
              projectId
            }
          });
          
          if (error) throw error;
          
          return {
            success: data.success !== false,
            message: `Scene ${type} ${data.success ? "updated" : "update failed"}`,
            data
          };
        }
          
        case "generateImage": {
          // Call product shot service
          const { data, error } = await supabase.functions.invoke("product-shot", {
            body: {
              sceneId,
              prompt: content,
              projectId,
              version: productShotVersion || "v2"
            }
          });
          
          if (error) throw error;
          
          return {
            success: data.success !== false,
            message: `Scene image ${data.success ? "generated" : "generation failed"}`,
            data
          };
        }
          
        case "generateVideo": {
          // Call image-to-video service
          const { data, error } = await supabase.functions.invoke("image-to-video", {
            body: {
              sceneId,
              aspectRatio: aspectRatio || "16:9",
              projectId
            }
          });
          
          if (error) throw error;
          
          return {
            success: data.success !== false,
            message: `Scene video ${data.success ? "generated" : "generation failed"}`,
            data
          };
        }
          
        case "createScene": {
          const { data, error } = await supabase
            .from("canvas_scenes")
            .insert({
              project_id: projectId,
              title: "New Scene",
              script: content || "",
              scene_order: 999 // Will be reordered by the backend
            })
            .select("id")
            .single();
          
          if (error) throw error;
          
          return {
            success: true,
            message: "New scene created",
            data: { sceneId: data.id }
          };
        }
          
        case "updateScene": {
          if (!sceneId) {
            throw new Error("sceneId is required for updateScene action");
          }
          
          const { error } = await supabase
            .from("canvas_scenes")
            .update({
              script: content
            })
            .eq("id", sceneId);
          
          if (error) throw error;
          
          return {
            success: true,
            message: "Scene updated",
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
