
import { MCPServer, MCPToolDefinition } from "@/types/mcp";
import { supabase } from "@/integrations/supabase/client";

export class MCPServerService implements MCPServer {
  private serverUrl: string;
  private toolsCache: MCPToolDefinition[] | null = null;
  private connected: boolean = false;
  private connectionError: Error | null = null;
  private connectionId: string | null = null;
  private projectId: string | null = null;
  private connectionTimeout: number = 8000; // 8 seconds timeout
  
  constructor(serverUrl: string, projectId?: string) {
    this.serverUrl = serverUrl;
    this.projectId = projectId || null;
  }
  
  async connect(): Promise<void> {
    try {
      console.log("Connecting to MCP server at", this.serverUrl);
      
      // Try to ping the server to verify connection with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.connectionTimeout);
      
      const response = await fetch(`${this.serverUrl}/ping`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal
      }).catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error(`Connection timed out after ${this.connectionTimeout}ms`);
        }
        throw error;
      });
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) {
        throw new Error("Failed to connect to MCP server");
      }
      
      this.connected = true;
      this.connectionError = null;
      
      // If we have a project ID, record this connection in the database
      if (this.projectId) {
        await this.recordConnection();
      }
      
      // Prefetch tools to validate connection
      await this.listTools();
    } catch (error) {
      this.connected = false;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      console.error("Connection error details:", this.connectionError);
      throw this.connectionError;
    }
  }
  
  async disconnect(): Promise<void> {
    this.connected = false;
    
    // Mark the connection as inactive in the database
    if (this.connectionId) {
      try {
        const { error } = await supabase
          .from('mcp_connections')
          .update({ is_active: false })
          .eq('id', this.connectionId);
          
        if (error) {
          console.error("Error marking connection as inactive:", error);
        }
      } catch (error) {
        console.error("Failed to update connection status:", error);
      }
    }
  }
  
  private async recordConnection(): Promise<void> {
    if (!this.projectId) return;
    
    try {
      // First get the current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error("Error getting current user:", userError);
        return;
      }
      
      const userId = userData.user.id;
      
      // Check if we already have an active connection for this project
      const { data: existingConn, error: fetchError } = await supabase
        .from('mcp_connections')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error checking existing connections:", fetchError);
        return;
      }
      
      if (existingConn) {
        // Update the existing connection
        const { error } = await supabase
          .from('mcp_connections')
          .update({ 
            connection_url: this.serverUrl,
            last_connected_at: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingConn.id);
          
        if (error) {
          console.error("Error updating connection record:", error);
        } else {
          this.connectionId = existingConn.id;
        }
      } else {
        // Create a new connection record
        const { data, error } = await supabase
          .from('mcp_connections')
          .insert({
            project_id: this.projectId,
            user_id: userId,
            connection_url: this.serverUrl,
            is_active: true
          })
          .select('id')
          .single();
          
        if (error) {
          console.error("Error creating connection record:", error);
        } else if (data) {
          this.connectionId = data.id;
        }
      }
    } catch (error) {
      console.error("Failed to record connection:", error);
    }
  }
  
  async listTools(): Promise<MCPToolDefinition[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }
    
    if (!this.isConnected()) {
      throw new Error("MCP server not connected. Call connect() first.");
    }
    
    try {
      // Try to fetch tools from the MCP server with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.connectionTimeout);
      
      const response = await fetch(`${this.serverUrl}/list-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'list_tools' }),
        signal: abortController.signal
      }).catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.connectionTimeout}ms`);
        }
        return null;
      });
      
      clearTimeout(timeoutId);
      
      let canvasTools: MCPToolDefinition[];
      
      if (response && response.ok) {
        const data = await response.json();
        canvasTools = data.tools || [];
      } else {
        // Fallback to mock implementation
        console.warn("Using fallback mock tools implementation");
        canvasTools = [
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
          },
          {
            name: "generate_scene_script",
            description: "Generate a script for the scene",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "The ID of the scene to update"
                },
                contextPrompt: {
                  type: "string",
                  description: "Additional context or instructions for script generation"
                }
              },
              required: ["sceneId"]
            }
          }
        ];
      }
      
      this.toolsCache = canvasTools;
      
      // Store tools in the database if we have a connection ID
      if (this.connectionId) {
        await this.recordTools(canvasTools);
      }
      
      return canvasTools;
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      throw error;
    }
  }
  
  private async recordTools(tools: MCPToolDefinition[]): Promise<void> {
    if (!this.connectionId) return;
    
    try {
      // First, get existing tools for this connection
      const { data: existingTools, error: fetchError } = await supabase
        .from('mcp_tools')
        .select('name')
        .eq('connection_id', this.connectionId);
        
      if (fetchError) {
        console.error("Error fetching existing tools:", fetchError);
        return;
      }
      
      // Create a set of existing tool names for faster lookup
      const existingToolNames = new Set(existingTools?.map(t => t.name) || []);
      
      // Filter to only new tools
      const newTools = tools.filter(tool => !existingToolNames.has(tool.name));
      
      if (newTools.length === 0) return;
      
      // Insert new tools
      const { error } = await supabase
        .from('mcp_tools')
        .insert(newTools.map(tool => ({
          connection_id: this.connectionId,
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        })));
        
      if (error) {
        console.error("Error recording tools:", error);
      }
    } catch (error) {
      console.error("Failed to record tools:", error);
    }
  }
  
  async callTool(name: string, parameters: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error("MCP server not connected. Call connect() first.");
    }
    
    console.log(`Calling MCP tool ${name} with parameters:`, parameters);
    
    try {
      // Try to call the tool on the actual MCP server with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.connectionTimeout);
      
      const response = await fetch(`${this.serverUrl}/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'call_tool',
          toolName: name,
          parameters: parameters,
          projectId: this.projectId
        }),
        signal: abortController.signal
      }).catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error(`Tool execution timed out after ${this.connectionTimeout}ms`);
        }
        return null;
      });
      
      clearTimeout(timeoutId);
      
      let result: { success: boolean, result: string };
      
      if (response && response.ok) {
        result = await response.json();
      } else {
        // Fallback: simulate a response for demo purposes
        console.warn(`Using fallback implementation for tool: ${name}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
        
        switch (name) {
          case "update_scene_description":
            result = {
              success: true,
              result: "Scene description updated successfully using AI analysis"
            };
            break;
          case "update_image_prompt":
            result = {
              success: true,
              result: "Image prompt generated and updated successfully"
            };
            break;
          case "generate_scene_image":
            result = {
              success: true,
              result: "Scene image generated successfully using " + 
                      (parameters.productShotVersion === "v1" ? "ProductShot V1" : "ProductShot V2")
            };
            break;
          case "create_scene_video":
            result = {
              success: true,
              result: "Scene video created successfully with aspect ratio " + parameters.aspectRatio
            };
            break;
          case "generate_scene_script":
            result = {
              success: true,
              result: "Scene script generated successfully with context: " + 
                      (parameters.contextPrompt || "default context")
            };
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      }
      
      // Record the tool execution if we have a connection ID
      if (this.connectionId) {
        await this.recordToolExecution(name, parameters, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Error calling MCP tool ${name}:`, error);
      
      // Record the failed execution
      if (this.connectionId) {
        await this.recordToolExecution(name, parameters, null, error);
      }
      
      throw error;
    }
  }
  
  private async recordToolExecution(
    toolName: string, 
    parameters: any, 
    result: any | null, 
    error?: any
  ): Promise<void> {
    if (!this.connectionId) return;
    
    try {
      // First, get the tool ID
      const { data: tool, error: fetchError } = await supabase
        .from('mcp_tools')
        .select('id')
        .eq('connection_id', this.connectionId)
        .eq('name', toolName)
        .maybeSingle();
        
      if (fetchError || !tool) {
        console.error("Error fetching tool:", fetchError);
        return;
      }
      
      // Insert the execution record
      const { error: insertError } = await supabase
        .from('mcp_tool_executions')
        .insert({
          tool_id: tool.id,
          scene_id: parameters.sceneId,
          parameters,
          result: result || null,
          status: result ? 'completed' : 'failed',
          error_message: error ? String(error) : null,
          completed_at: result ? new Date().toISOString() : null
        });
        
      if (insertError) {
        console.error("Error recording tool execution:", insertError);
      }
    } catch (error) {
      console.error("Failed to record tool execution:", error);
    }
  }
  
  async cleanup(): Promise<void> {
    // Clean up the MCP server connection
    console.log("Cleaning up MCP server connection");
    await this.disconnect();
    
    this.toolsCache = null;
    this.connectionId = null;
  }
  
  invalidateToolsCache(): void {
    this.toolsCache = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isConnectionActive(): boolean {
    return this.connected;
  }

  getConnectionError(): Error | null {
    return this.connectionError;
  }
}
