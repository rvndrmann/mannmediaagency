
import { MCPServer } from "@/types/mcp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPABASE_URL } from "@/integrations/supabase/client";

// Implementation of MCP server integration
export class MCPServerService implements MCPServer {
  private serverUrl: string;
  private authToken: string | null = null;
  private toolsCache: any[] | null = null;
  private connected: boolean = false;
  private name: string = "MCP Server";
  
  constructor(serverUrl?: string, authToken?: string, name?: string) {
    // Use the provided URL or default to the Supabase Edge Function URL
    this.serverUrl = serverUrl || 
      `${SUPABASE_URL}/functions/v1/mcp-server`;
    
    // Use the provided token or try to get it from local storage
    this.authToken = authToken || null;
    
    if (name) {
      this.name = name;
    }
    
    console.log(`MCPServerService (${this.name}) initialized with URL:`, this.serverUrl);
  }
  
  async connect(): Promise<void> {
    try {
      if (this.connected) {
        console.log(`MCPServerService (${this.name}) already connected`);
        return;
      }
      
      console.log(`Connecting to MCP server (${this.name}) at`, this.serverUrl);
      
      // Try to get auth token if not already set
      if (!this.authToken) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          this.authToken = session?.access_token || null;
        } catch (error) {
          console.warn(`Could not retrieve auth token for MCP server (${this.name})`, error);
        }
      }
      
      // Test the connection with a simple ping
      const response = await this.makeRequest({
        operation: "ping"
      });
      
      if (response && response.success) {
        console.log(`Successfully connected to MCP server (${this.name})`);
        this.connected = true;
      } else {
        throw new Error(`Failed to connect to MCP server (${this.name})`);
      }
    } catch (error) {
      console.error(`MCP server (${this.name}) connection error:`, error);
      this.connected = false;
      throw new Error(`Failed to connect to MCP server (${this.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async listTools(): Promise<any[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }
    
    try {
      if (!this.connected) {
        await this.connect();
      }
      
      const response = await this.makeRequest({
        operation: "list_tools"
      });
      
      if (response && response.success && Array.isArray(response.tools)) {
        this.toolsCache = response.tools;
        return response.tools;
      } else {
        throw new Error(`Failed to fetch tools from MCP server (${this.name})`);
      }
    } catch (error) {
      console.error(`Error listing MCP tools from (${this.name}):`, error);
      throw error;
    }
  }
  
  async callTool(name: string, parameters: any): Promise<any> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      
      console.log(`Calling MCP tool ${name} with parameters:`, parameters);
      
      const response = await this.makeRequest({
        operation: "call_tool",
        toolName: name,
        parameters: parameters
      });
      
      if (response && response.success) {
        return response;
      } else {
        throw new Error(response?.error || `Failed to call tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error calling MCP tool ${name}:`, error);
      toast.error(`Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    console.log(`Cleaning up MCP server (${this.name}) connection`);
    this.connected = false;
    this.toolsCache = null;
  }
  
  invalidateToolsCache(): void {
    this.toolsCache = null;
  }
  
  private async makeRequest(data: any): Promise<any> {
    try {
      if (!this.serverUrl) {
        throw new Error("MCP server URL is not defined");
      }
      
      console.log(`Making request to MCP server (${this.name}) at ${this.serverUrl}`);
      
      // Use supabase.functions.invoke for MCP server requests
      const { data: responseData, error } = await supabase.functions.invoke('mcp-server', {
        body: data,
        headers: this.authToken ? {
          Authorization: `Bearer ${this.authToken}`
        } : undefined
      });
      
      if (error) {
        console.error(`MCP Server (${this.name}) request error:`, error);
        throw error;
      }
      
      return responseData;
    } catch (error) {
      console.error(`Error making MCP server (${this.name}) request:`, error);
      throw error;
    }
  }
  
  // Getters
  isConnected(): boolean {
    return this.connected;
  }
  
  getServerUrl(): string {
    return this.serverUrl;
  }
  
  getName(): string {
    return this.name;
  }
}
