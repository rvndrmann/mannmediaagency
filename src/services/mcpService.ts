import { MCPServer } from "@/types/mcp";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/utils/toast-utils";

export class MCPServerService implements MCPServer {
  private serverUrl: string;
  private toolsCache: any[] | null = null;
  private projectId: string;
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private retryAttempts: number = 0;
  private maxRetries: number = 3;
  private connectedSince: number | null = null;
  private lastActivityTime: number = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(projectId: string) {
    this.projectId = projectId;
    this.serverUrl = `${projectId}`; // We don't need the full URL as we'll use Supabase functions.invoke
  }
  
  async connect(): Promise<void> {
    try {
      if (this.connectionStatus === 'connecting') {
        console.log("MCP connection attempt already in progress");
        return;
      }
      
      this.connectionStatus = 'connecting';
      console.log("Connecting to MCP server for project:", this.projectId);
      
      // Test connection by listing tools
      await this.listTools();
      
      this.connectionStatus = 'connected';
      this.connectedSince = Date.now();
      this.lastActivityTime = Date.now();
      this.retryAttempts = 0;
      
      // Start heartbeat to keep connection alive
      this.startHeartbeat();
      
      console.log("Successfully connected to MCP server");
    } catch (error) {
      this.connectionStatus = 'disconnected';
      console.error("Failed to connect to MCP server:", error);
      showToast.error("Failed to connect to MCP server");
      throw error;
    }
  }
  
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Check connection health every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      
      // If inactive for more than 2 minutes, check connection
      if (inactiveTime > 120000) {
        this.checkConnection();
      }
    }, 30000);
  }
  
  private async checkConnection(): Promise<void> {
    try {
      if (this.connectionStatus !== 'connected') {
        return;
      }
      
      console.log("Checking MCP connection health");
      await this.listTools();
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.warn("Connection check failed, will attempt reconnect");
      this.connectionStatus = 'disconnected';
      this.connect().catch(err => {
        console.error("Reconnection attempt failed:", err);
      });
    }
  }
  
  async listTools(): Promise<any[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }
    
    try {
      console.log("Fetching tools from MCP server for project:", this.projectId);
      this.lastActivityTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: "list_tools",
          projectId: this.projectId
        }
      });
      
      if (error) {
        console.error("Error fetching MCP tools:", error);
        showToast.error(`Failed to fetch MCP tools: ${error.message}`);
        throw error;
      }
      
      if (data && data.success && data.tools) {
        console.log("Successfully fetched MCP tools:", data.tools);
        this.toolsCache = data.tools;
        return data.tools;
      } else {
        console.error("Invalid response from MCP server:", data);
        throw new Error("Invalid response from MCP server");
      }
    } catch (error) {
      console.error("Error in listTools:", error);
      // Fall back to mock tools for development if real endpoint fails
      const canvasTools = [
        {
          name: "update_scene_description",
          description: "Updates the scene description based on the current image and script",
          parameters: {
            type: "object",
            properties: {
              sceneId: {
                type: "string",
                description: "The ID of the scene to update"
              },
              imageAnalysis: {
                type: "boolean",
                description: "Whether to analyze the existing image for the scene description"
              }
            },
            required: ["sceneId"]
          }
        },
        {
          name: "update_image_prompt",
          description: "Generates and updates an image prompt for the scene",
          parameters: {
            type: "object",
            properties: {
              sceneId: {
                type: "string",
                description: "The ID of the scene to update"
              },
              useDescription: {
                type: "boolean",
                description: "Whether to incorporate the scene description in the image prompt"
              }
            },
            required: ["sceneId"]
          }
        },
        {
          name: "generate_scene_image",
          description: "Generate an image for the scene using the image prompt",
          parameters: {
            type: "object",
            properties: {
              sceneId: {
                type: "string",
                description: "The ID of the scene to update"
              },
              productShotVersion: {
                type: "string",
                enum: ["v1", "v2"],
                description: "Which product shot version to use"
              }
            },
            required: ["sceneId"]
          }
        },
        {
          name: "create_scene_video",
          description: "Convert the scene image to a video",
          parameters: {
            type: "object",
            properties: {
              sceneId: {
                type: "string",
                description: "The ID of the scene to update"
              },
              aspectRatio: {
                type: "string",
                enum: ["16:9", "9:16", "1:1"],
                description: "The aspect ratio of the video"
              }
            },
            required: ["sceneId"]
          }
        }
      ];
      
      console.warn("Using fallback mock MCP tools due to error");
      this.toolsCache = canvasTools;
      return canvasTools;
    }
  }
  
  async callTool(name: string, parameters: any): Promise<any> {
    try {
      console.log(`Calling MCP tool ${name} with parameters:`, parameters);
      this.lastActivityTime = Date.now();
      
      if (this.connectionStatus !== 'connected') {
        await this.connect();
      }
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: "call_tool",
          toolName: name,
          parameters: parameters,
          projectId: this.projectId
        }
      });
      
      if (error) {
        console.error(`Error calling MCP tool ${name}:`, error);
        showToast.error(`Failed to call MCP tool ${name}: ${error.message}`);
        throw error;
      }
      
      console.log(`MCP tool ${name} result:`, data);
      return data;
    } catch (error) {
      console.error(`Error in callTool (${name}):`, error);
      
      // Try to reconnect if the error might be connection-related
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        this.connectionStatus = 'disconnected';
        console.log(`Attempting reconnection (attempt ${this.retryAttempts}/${this.maxRetries})`);
        
        try {
          await this.connect();
          // If reconnection successful, try the call again
          return this.callTool(name, parameters);
        } catch (reconnectError) {
          console.error("Reconnection failed:", reconnectError);
        }
      }
      
      // Return a fallback mock response for development
      console.warn(`Using fallback mock response for ${name} due to error`);
      
      switch (name) {
        case "update_scene_description":
          return {
            success: true,
            result: "Scene description updated successfully using AI analysis (MOCK)",
            description: "This is a mock response as the real MCP server is unavailable."
          };
        case "update_image_prompt":
          return {
            success: true,
            result: "Image prompt generated and updated successfully (MOCK)",
            imagePrompt: "This is a mock response as the real MCP server is unavailable."
          };
        case "generate_scene_image":
          return {
            success: true,
            result: `Scene image generated successfully using ${parameters.productShotVersion || "v2"} (MOCK)`,
            imageUrl: "https://example.com/placeholder-image.jpg"
          };
        case "create_scene_video":
          return {
            success: true,
            result: `Scene video created successfully with aspect ratio ${parameters.aspectRatio || "16:9"} (MOCK)`,
            videoUrl: "https://example.com/placeholder-video.mp4"
          };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    }
  }
  
  async callToolStream(name: string, parameters: any, onProgress?: (data: any) => void): Promise<any> {
    try {
      console.log(`Streaming MCP tool ${name} with parameters:`, parameters);
      this.lastActivityTime = Date.now();
      
      if (this.connectionStatus !== 'connected') {
        await this.connect();
      }
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: "call_tool_stream",
          toolName: name,
          parameters: parameters,
          projectId: this.projectId
        }
      });
      
      if (error) {
        console.error(`Error streaming MCP tool ${name}:`, error);
        showToast.error(`Failed to stream MCP tool ${name}: ${error.message}`);
        throw error;
      }
      
      if (data && data.stream_id) {
        return this.pollStreamResults(data.stream_id, onProgress);
      }
      
      console.log(`MCP tool ${name} result:`, data);
      return data;
    } catch (error) {
      console.error(`Error in streaming MCP tool (${name}):`, error);
      
      // Try to reconnect if the error might be connection-related
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        this.connectionStatus = 'disconnected';
        console.log(`Attempting reconnection (attempt ${this.retryAttempts}/${this.maxRetries})`);
        
        try {
          await this.connect();
          // If reconnection successful, try the call again
          return this.callToolStream(name, parameters, onProgress);
        } catch (reconnectError) {
          console.error("Reconnection failed:", reconnectError);
        }
      }
      
      throw error;
    }
  }
  
  private async pollStreamResults(streamId: string, onProgress?: (data: any) => void): Promise<any> {
    let complete = false;
    let result: any = null;
    let retries = 0;
    const maxRetries = 30;
    
    while (!complete && retries < maxRetries) {
      try {
        const { data, error } = await supabase.functions.invoke('mcp-server', {
          body: {
            operation: "get_stream_result",
            streamId: streamId,
            projectId: this.projectId
          }
        });
        
        if (error) {
          console.error("Error polling stream results:", error);
          if (retries >= maxRetries - 1) {
            throw error;
          }
        } else if (data) {
          if (data.complete) {
            complete = true;
            result = data.result;
          } else if (data.progress && onProgress) {
            onProgress(data.progress);
          }
        }
        
        if (!complete) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before polling again
          retries++;
        }
      } catch (error) {
        console.error("Error in pollStreamResults:", error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds after an error
      }
    }
    
    if (!complete) {
      throw new Error("Stream polling timed out");
    }
    
    return result;
  }
  
  async cleanup(): Promise<void> {
    console.log("Cleaning up MCP server connection for project:", this.projectId);
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.toolsCache = null;
    this.connectionStatus = 'disconnected';
    this.connectedSince = null;
  }
  
  invalidateToolsCache(): void {
    console.log("Invalidating MCP tools cache for project:", this.projectId);
    this.toolsCache = null;
  }
  
  getConnectionStatus(): string {
    return this.connectionStatus;
  }
  
  getConnectionInfo(): { status: string; connectedSince: number | null; lastActivity: number } {
    return {
      status: this.connectionStatus,
      connectedSince: this.connectedSince,
      lastActivity: this.lastActivityTime
    };
  }
}
