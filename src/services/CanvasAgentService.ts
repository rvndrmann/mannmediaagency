
import { supabase } from "@/integrations/supabase/client";
import { MCPServerService } from "./mcpService";
import { toast } from "sonner";
import { SceneUpdateType } from "@/types/canvas";

export type CanvasAgentType = "scene" | "image" | "video" | null;

interface AgentResult {
  success: boolean;
  generatedContent?: string;
  error?: string;
}

export class CanvasAgentService {
  private mcpServer: MCPServerService | null = null;
  private isProcessing = false;
  private activeAgent: CanvasAgentType = null;
  private projectId: string;
  private sceneId: string;

  constructor(projectId: string, sceneId: string) {
    this.projectId = projectId;
    this.sceneId = sceneId;
  }

  async connectMcp(): Promise<boolean> {
    try {
      this.mcpServer = new MCPServerService();
      await this.mcpServer.connect();
      console.log("Successfully connected to MCP server");
      return true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      this.mcpServer = null;
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.mcpServer) {
      await this.mcpServer.cleanup();
      this.mcpServer = null;
    }
  }

  isMcpConnected(): boolean {
    return !!this.mcpServer?.isConnected?.();
  }

  getActiveAgent(): CanvasAgentType {
    return this.activeAgent;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  async processAgentRequest(
    type: CanvasAgentType,
    prompt: string,
    updateType: SceneUpdateType
  ): Promise<AgentResult> {
    if (this.isProcessing) {
      return { success: false, error: "Already processing a request" };
    }

    this.isProcessing = true;
    this.activeAgent = type;
    
    let generatedContent = "";

    try {
      if (this.mcpServer && this.isMcpConnected()) {
        // Use MCP to process the request
        const toolName = updateType === 'description' 
          ? 'update_scene_description' 
          : updateType === 'imagePrompt' 
            ? 'update_image_prompt' 
            : updateType === 'image' 
              ? 'generate_scene_image' 
              : 'create_scene_video';
              
        const result = await this.mcpServer.callTool(toolName, {
          sceneId: this.sceneId,
          imageAnalysis: updateType === 'description',
          useDescription: updateType === 'imagePrompt',
          productShotVersion: updateType === 'image' ? "v2" : undefined,
          aspectRatio: updateType === 'video' ? "16:9" : undefined
        });
        
        if (result.success) {
          // Capture the generated content from the result
          if (updateType === 'description' && result.description) {
            generatedContent = result.description;
          } else if (updateType === 'imagePrompt' && result.imagePrompt) {
            generatedContent = result.imagePrompt;
          }
          
          return { 
            success: true, 
            generatedContent
          };
        } else {
          throw new Error(result.error || "Failed to process request with MCP");
        }
      }
      
      // Legacy implementation (without MCP)
      console.log("Using legacy implementation for " + type);
      const { data, error } = await supabase.functions.invoke(
        type === 'image' ? 'generate-image-prompts' : 'canvas-scene-agent',
        {
          body: {
            sceneId: this.sceneId,
            prompt,
            type: updateType,
            projectId: this.projectId
          }
        }
      );

      if (error) {
        throw error;
      }

      if (data && data.success) {
        generatedContent = data.content || data.imagePrompt || '';
        
        return { 
          success: true, 
          generatedContent
        };
      } else {
        throw new Error(data?.error || "Failed to process request");
      }
    } catch (error) {
      console.error(`Error processing ${type} agent request:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isProcessing = false;
      this.activeAgent = null;
    }
  }
}
