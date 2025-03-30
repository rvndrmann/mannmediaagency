
import { MCPServer } from "@/types/mcp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Implementation of MCP server integration
export class MCPServerService implements MCPServer {
  private serverUrl: string;
  private authToken: string | null = null;
  private toolsCache: any[] | null = null;
  
  constructor(serverUrl?: string, authToken?: string) {
    // Use the provided URL or default to the Supabase Edge Function URL
    this.serverUrl = serverUrl || 
      `${supabase.functions.url}/mcp-server`;
    
    // Use the provided token or try to get it from local storage
    this.authToken = authToken || 
      localStorage.getItem('mcpServerToken');
    
    console.log("MCPServerService initialized with URL:", this.serverUrl);
  }
  
  async connect(): Promise<void> {
    try {
      console.log("Connecting to MCP server at", this.serverUrl);
      
      // Test the connection with a simple ping
      const response = await this.makeRequest({
        operation: "ping"
      });
      
      if (response && response.success) {
        console.log("Successfully connected to MCP server");
      } else {
        throw new Error("Failed to connect to MCP server");
      }
    } catch (error) {
      console.error("MCP server connection error:", error);
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async listTools(): Promise<any[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }
    
    try {
      const response = await this.makeRequest({
        operation: "list_tools"
      });
      
      if (response && response.success && Array.isArray(response.tools)) {
        this.toolsCache = response.tools;
        return response.tools;
      } else {
        throw new Error("Failed to fetch tools from MCP server");
      }
    } catch (error) {
      console.error("Error listing MCP tools:", error);
      throw error;
    }
  }
  
  async callTool(name: string, parameters: any): Promise<any> {
    try {
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
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    console.log("Cleaning up MCP server connection");
    this.toolsCache = null;
  }
  
  invalidateToolsCache(): void {
    this.toolsCache = null;
  }
  
  private async makeRequest(data: any): Promise<any> {
    try {
      // For direct Supabase Edge Function calls
      const { data: responseData, error } = await supabase.functions.invoke('mcp-server', {
        body: data
      });
      
      if (error) {
        console.error("MCP Server request error:", error);
        throw error;
      }
      
      return responseData;
    } catch (error) {
      console.error("Error making MCP server request:", error);
      throw error;
    }
  }
}
