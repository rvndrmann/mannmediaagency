
import { supabase } from "@/integrations/supabase/client";
import { MCPServerService } from "../mcpService";
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
  private maxRetries = 2;
  private retryCount = 0;

  constructor(projectId: string, sceneId: string) {
    this.projectId = projectId;
    this.sceneId = sceneId;
  }

  async connectMcp(retryOnFailure = true): Promise<boolean> {
    try {
      this.mcpServer = new MCPServerService();
      await this.mcpServer.connect();
      console.log("Successfully connected to MCP server");
      this.retryCount = 0; // Reset retry count on successful connection
      return true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      
      // Implement retry logic with exponential backoff
      if (retryOnFailure && this.retryCount < this.maxRetries) {
        this.retryCount++;
        const backoffTime = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        console.log(`Retrying connection in ${backoffTime/1000} seconds... (Attempt ${this.retryCount} of ${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.connectMcp(true);
      }
      
      this.mcpServer = null;
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.mcpServer) {
      await this.mcpServer.cleanup();
      this.mcpServer = null;
    }
    this.retryCount = 0;
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
      // Try MCP approach first
      if (!this.mcpServer || !this.isMcpConnected()) {
        const connected = await this.connectMcp();
        if (!connected) {
          console.log("Could not connect to MCP server, falling back to legacy approach");
        }
      }
      
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
          console.warn("MCP request failed, falling back to legacy approach:", result.error);
          // Don't throw an error, just fall through to legacy approach
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
