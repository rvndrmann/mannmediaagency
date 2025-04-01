
import { supabase } from "@/integrations/supabase/client";
import { CanvasService } from "../canvas/CanvasService";
import { MCPService } from "../mcp/MCPService";

/**
 * Service for managing integrations with third-party services and APIs
 */
export class IntegrationService {
  private static instance: IntegrationService;
  private mcpService: MCPService;
  private canvasService: CanvasService;
  
  private constructor() {
    this.mcpService = MCPService.getInstance();
    this.canvasService = CanvasService.getInstance();
  }
  
  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }
  
  /**
   * Initialize the MCP connection for a project
   */
  async initMcpForProject(projectId: string): Promise<boolean> {
    try {
      // Check if the project exists
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        console.error(`Project ${projectId} not found`);
        return false;
      }
      
      // Check if an MCP connection already exists for this project
      const connection = await this.getMcpConnectionForProject(projectId);
      
      if (connection) {
        // Connection already exists, reconnect to it
        return await this.mcpService.connectToServer(connection.connection_url);
      }
      
      // Create a new MCP connection
      const newConnection = await this.createMcpConnection(projectId);
      
      if (!newConnection) {
        console.error(`Failed to create MCP connection for project ${projectId}`);
        return false;
      }
      
      // Connect to the server
      return await this.mcpService.connectToServer(newConnection.connection_url);
    } catch (error) {
      console.error("Error initializing MCP for project:", error);
      return false;
    }
  }
  
  /**
   * Get an MCP connection for a project
   */
  private async getMcpConnectionForProject(projectId: string): Promise<any> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found");
        return null;
      }
      
      // Get the connection from the database via RPC
      const { data, error } = await supabase.rpc('get_mcp_connection_for_project', {
        project_id: projectId,
        user_id: user.id
      });
      
      if (error) {
        console.error("Error getting MCP connection:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error getting MCP connection:", error);
      return null;
    }
  }
  
  /**
   * Create a new MCP connection
   */
  private async createMcpConnection(projectId: string): Promise<any> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found");
        return null;
      }
      
      // Initialize the MCP service
      const connectionUrl = await this.mcpService.getConnectionUrl();
      
      if (!connectionUrl) {
        console.error("Failed to get MCP connection URL");
        return null;
      }
      
      // Create a new connection in the database via RPC
      const { data, error } = await supabase.rpc('create_mcp_connection', {
        project_id: projectId,
        user_id: user.id,
        connection_url: connectionUrl
      });
      
      if (error) {
        console.error("Error creating MCP connection:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error creating MCP connection:", error);
      return null;
    }
  }
}
