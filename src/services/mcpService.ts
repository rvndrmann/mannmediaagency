
import { toast } from "sonner";

interface MCPServerResult {
  success: boolean;
  result?: string;
  error?: string;
  description?: string;
  imagePrompt?: string;
}

interface MCPToolParams {
  sceneId: string;
  imageAnalysis?: boolean;
  useDescription?: boolean;
  productShotVersion?: string;
  aspectRatio?: string;
}

export class MCPServerService {
  private connected = false;
  private serverUrl = 'http://localhost:4000'; // Default MCP server URL

  constructor(serverUrl?: string) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'ok') {
        this.connected = true;
        console.log('Connected to MCP server');
      } else {
        throw new Error('Server health check failed');
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

  async callTool(toolName: string, params: MCPToolParams): Promise<MCPServerResult> {
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
      const response = await fetch(`${this.serverUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
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
}
