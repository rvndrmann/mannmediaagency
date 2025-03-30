
import { toast } from "sonner";
import { MCPServer, MCPToolParameters, MCPToolResponse } from "@/types/mcp";

export class MCPServerService implements MCPServer {
  private connected = false;
  private serverUrl = 'https://avdwgvjhufslhqrrmxgo.supabase.co/functions/v1/mcp-server'; // Updated to use Supabase URL

  constructor(serverUrl?: string) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation: 'ping' })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        this.connected = true;
        console.log('Connected to MCP server');
      } else {
        throw new Error(data.error || 'Server ping failed');
      }
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.connected = false;
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  async listTools(): Promise<any[]> {
    if (!this.connected) {
      try {
        await this.connect();
      } catch (error) {
        return [];
      }
    }

    try {
      const response = await fetch(`${this.serverUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation: 'list_tools' })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? (data.tools || []) : [];
    } catch (error) {
      console.error("Error listing tools:", error);
      return [];
    }
  }

  async callTool(toolName: string, params: MCPToolParameters): Promise<MCPToolResponse> {
    if (!this.connected) {
      try {
        await this.connect();
      } catch (error) {
        return {
          success: false,
          error: `Not connected to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    try {
      const response = await fetch(`${this.serverUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'call_tool',
          toolName,
          parameters: params
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      return {
        success: false,
        error: `Error calling tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    // Any cleanup logic needed when disconnecting
    this.connected = false;
    console.log('Disconnected from MCP server');
  }

  invalidateToolsCache(): void {
    // Method to invalidate any cached tools data
    console.log('Tool cache invalidated');
  }

  getName(): string {
    return "Default MCP Server";
  }
}
