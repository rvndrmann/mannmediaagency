
import { supabase } from "@/integrations/supabase/client";
import { MCPServerService } from "@/services/mcpService";
import { showToast } from "@/utils/toast-utils";

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
    let mcpServer = null;
    
    try {
      const { action, projectId, sceneId, content, useMcp = true, productShotVersion, aspectRatio } = params;
      
      // Default to MCP execution (now the default approach)
      if (useMcp !== false) {
        console.log(`Executing canvas tool with MCP for project ${projectId}, action: ${action}`);
        
        mcpServer = new MCPServerService(projectId);
        
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
          
          console.log(`Calling MCP tool: ${toolName} with params:`, toolParams);
          
          const result = await mcpServer.callTool(toolName, toolParams);
          
          if (mcpServer) {
            await mcpServer.cleanup();
          }
          
          console.log(`MCP tool result for ${toolName}:`, result);
          return {
            success: result.success !== false,
            message: result.result || "Operation completed via MCP",
            data: result
          };
        } catch (error) {
          console.error("Error using MCP for canvas tool:", error);
          showToast.error(`MCP operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // Allow fallback to legacy implementation if MCP fails
          if (useMcp === true) {
            console.log("Falling back to legacy implementation after MCP failure");
          } else {
            if (mcpServer) {
              await mcpServer.cleanup();
            }
            throw error; // Re-throw if explicit MCP was requested
          }
        }
      }
      
      // Legacy execution (without MCP)
      console.log(`Executing canvas tool with legacy implementation for project ${projectId}, action: ${action}`);
      
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
      
      if (mcpServer) {
        try {
          await mcpServer.cleanup();
        } catch (cleanupError) {
          console.error("Error during MCP server cleanup:", cleanupError);
        }
      }
      
      return {
        success: false,
        message: `Canvas operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }
};
