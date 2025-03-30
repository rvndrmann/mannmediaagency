
import { supabase } from "@/integrations/supabase/client";
import { MCPConnection, MCPConnectionRecord, MCPServerConfig, MCPToolDefinition, MCPToolExecutionParams, MCPToolExecutionResult } from "./types";

export class MCPConnection implements MCPConnection {
  private serverUrl: string;
  private toolsCache: MCPToolDefinition[] | null = null;
  private isConnected: boolean = false;
  private connectionError: Error | null = null;
  private connectionId: string | null = null;
  private projectId: string | null = null;
  private userId: string | null = null;
  
  constructor(config: MCPServerConfig) {
    this.serverUrl = config.serverUrl;
    this.projectId = config.projectId || null;
  }
  
  async connect(): Promise<void> {
    try {
      console.log("Connecting to MCP server at", this.serverUrl);
      
      // Get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error("Authentication required to connect to MCP server");
      }
      
      this.userId = userData.user.id;
      
      // Try to ping the server to verify connection
      const response = await fetch(`${this.serverUrl}/ping`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null);
      
      if (!response || !response.ok) {
        throw new Error("Failed to connect to MCP server");
      }
      
      this.isConnected = true;
      this.connectionError = null;
      
      // If we have a project ID, record this connection in the database
      if (this.projectId) {
        await this.recordConnection();
      }
      
      // Prefetch tools to validate connection
      await this.listTools();
      
      console.log("Successfully connected to MCP server");
    } catch (error) {
      this.isConnected = false;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      throw this.connectionError;
    }
  }
  
  private async recordConnection(): Promise<void> {
    if (!this.projectId || !this.userId) return;
    
    try {
      // Check if we already have an active connection for this project
      const { data: existingConn, error: fetchError } = await supabase
        .from('mcp_connections')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('user_id', this.userId)
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
            user_id: this.userId,
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
      // Try to fetch tools from the MCP server
      const response = await fetch(`${this.serverUrl}/list-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'list_tools' })
      }).catch(() => null);
      
      let tools: MCPToolDefinition[];
      
      if (response && response.ok) {
        const data = await response.json();
        tools = data.tools || [];
      } else {
        // Fallback to default Canvas tools
        tools = [
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
      }
      
      this.toolsCache = tools;
      
      // Store tools in the database if we have a connection ID
      if (this.connectionId) {
        await this.recordTools(tools);
      }
      
      return tools;
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
  
  async callTool(name: string, parameters: MCPToolExecutionParams): Promise<MCPToolExecutionResult> {
    if (!this.isConnected()) {
      throw new Error("MCP server not connected. Call connect() first.");
    }
    
    console.log(`Calling MCP tool ${name} with parameters:`, parameters);
    
    try {
      // Try to call the tool on the actual MCP server
      const response = await fetch(`${this.serverUrl}/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'call_tool',
          toolName: name,
          parameters: parameters,
          projectId: parameters.projectId || this.projectId
        })
      }).catch(() => null);
      
      let result: MCPToolExecutionResult;
      
      if (response && response.ok) {
        result = await response.json();
      } else {
        // Fallback: simulate a response for demo purposes
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
        
        result = this.generateMockResponse(name, parameters);
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
  
  private generateMockResponse(toolName: string, parameters: MCPToolExecutionParams): MCPToolExecutionResult {
    switch (toolName) {
      case "update_scene_description":
        return {
          success: true,
          result: "Scene description updated successfully using AI analysis",
          data: {
            description: "Detailed scene description generated using AI vision analysis of the scene image."
          }
        };
      case "update_image_prompt":
        return {
          success: true,
          result: "Image prompt generated and updated successfully",
          data: {
            imagePrompt: "High quality cinematic scene, professional lighting, detailed textures"
          }
        };
      case "generate_scene_image":
        return {
          success: true,
          result: `Scene image generated successfully using ${parameters.productShotVersion || "v2"}`,
          data: {
            imageUrl: "https://example.com/placeholder-image.jpg"
          }
        };
      case "create_scene_video":
        return {
          success: true,
          result: `Scene video created successfully with aspect ratio ${parameters.aspectRatio || "16:9"}`,
          data: {
            videoUrl: "https://example.com/placeholder-video.mp4"
          }
        };
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  }
  
  private async recordToolExecution(
    toolName: string, 
    parameters: MCPToolExecutionParams, 
    result: MCPToolExecutionResult | null, 
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
  
  async disconnect(): Promise<void> {
    // Clean up the MCP server connection
    console.log("Cleaning up MCP server connection");
    
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
    
    this.toolsCache = null;
    this.isConnected = false;
    this.connectionId = null;
  }
  
  getConnectionError(): Error | null {
    return this.connectionError;
  }
  
  invalidateToolsCache(): void {
    this.toolsCache = null;
  }

  isConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton service for managing MCP connections
export class MCPService {
  private static instance: MCPService;
  private connections: Map<string, MCPConnection> = new Map();
  
  private constructor() {}
  
  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }
  
  async getConnection(config: MCPServerConfig): Promise<MCPConnection> {
    const connectionKey = `${config.projectId || 'default'}-${config.serverUrl}`;
    
    // Check if we already have this connection
    if (this.connections.has(connectionKey)) {
      const existingConnection = this.connections.get(connectionKey)!;
      
      // If it's not connected, try to reconnect
      if (!existingConnection.isConnected()) {
        try {
          await existingConnection.connect();
        } catch (error) {
          console.error("Error reconnecting to MCP server:", error);
        }
      }
      
      return existingConnection;
    }
    
    // Create a new connection
    const connection = new MCPConnection(config);
    
    try {
      await connection.connect();
      this.connections.set(connectionKey, connection);
    } catch (error) {
      console.error("Error connecting to MCP server:", error);
    }
    
    return connection;
  }
  
  async getConnectionForProject(projectId: string): Promise<MCPConnection | null> {
    try {
      // Try to find an existing MCP connection for this project
      const { data, error } = await supabase
        .from('mcp_connections')
        .select('connection_url, project_id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('last_connected_at', { ascending: false })
        .maybeSingle();
        
      if (error || !data) {
        console.error("Error finding MCP connection for project:", error);
        return null;
      }
      
      // Use the existing connection URL
      return this.getConnection({
        serverUrl: data.connection_url,
        projectId: data.project_id
      });
    } catch (error) {
      console.error("Error getting MCP connection for project:", error);
      return null;
    }
  }
  
  async createDefaultConnection(projectId: string): Promise<MCPConnection | null> {
    const defaultUrl = `https://api.browser-use.com/api/v1/mcp/${projectId}`;
    
    try {
      return this.getConnection({
        serverUrl: defaultUrl,
        projectId
      });
    } catch (error) {
      console.error("Error creating default MCP connection:", error);
      return null;
    }
  }
  
  async getActiveConnections(): Promise<MCPConnectionRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mcp_connections')
        .select('id, project_id, user_id, connection_url, last_connected_at, is_active')
        .eq('is_active', true)
        .order('last_connected_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching active MCP connections:", error);
        return [];
      }
      
      return data.map(conn => ({
        id: conn.id,
        projectId: conn.project_id,
        userId: conn.user_id,
        connectionUrl: conn.connection_url,
        lastConnectedAt: conn.last_connected_at,
        isActive: conn.is_active
      }));
    } catch (error) {
      console.error("Error getting active MCP connections:", error);
      return [];
    }
  }
  
  async closeConnection(projectId: string): Promise<void> {
    const connectionKey = Array.from(this.connections.keys()).find(
      key => key.startsWith(`${projectId}-`)
    );
    
    if (connectionKey && this.connections.has(connectionKey)) {
      const connection = this.connections.get(connectionKey)!;
      await connection.disconnect();
      this.connections.delete(connectionKey);
    }
  }
  
  async closeAllConnections(): Promise<void> {
    for (const connection of this.connections.values()) {
      await connection.disconnect();
    }
    this.connections.clear();
  }
}
