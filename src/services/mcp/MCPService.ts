
import { MCPServer } from "@/types/mcp";
import { MCPServerService } from "@/services/mcpService";
import { supabase } from "@/integrations/supabase/client";
import { MCPConnectionRecord } from "./types";
import { toast } from "sonner";

/**
 * Service for managing MCP server connections across the application
 */
export class MCPService {
  private static instance: MCPService;
  private connectionPool: Map<string, MCPServer> = new Map();
  private defaultServerUrl: string = "https://edge-runtime.supabase.com/mcp-server";
  
  private constructor() {}
  
  /**
   * Get the singleton instance of MCPService
   */
  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }
  
  /**
   * Get an existing MCP server for a project, if one exists
   */
  public async getServerForProject(projectId: string): Promise<MCPServer | null> {
    // Check if we already have a server in the pool
    if (this.connectionPool.has(projectId)) {
      const server = this.connectionPool.get(projectId)!;
      
      // Ensure it's still connected
      if (server.isConnectionActive()) {
        return server;
      } else {
        // Try to reconnect if inactive
        try {
          await server.connect();
          return server;
        } catch (error) {
          console.error("Failed to reconnect to existing MCP server:", error);
          // Remove from pool if reconnection fails
          this.connectionPool.delete(projectId);
          return null;
        }
      }
    }
    
    // Try to load from database
    try {
      const existingConnection = await this.getExistingConnection(projectId);
      
      if (existingConnection) {
        const server = this.createServerFromConnection(existingConnection);
        try {
          await server.connect();
          this.connectionPool.set(projectId, server);
          return server;
        } catch (error) {
          console.error("Failed to connect to saved MCP server:", error);
          return null;
        }
      }
    } catch (error) {
      console.error("Error fetching existing connection:", error);
    }
    
    return null;
  }
  
  /**
   * Create a default MCP server for a project
   */
  public async createDefaultServer(projectId: string): Promise<MCPServer | null> {
    try {
      const server = new MCPServerService(this.defaultServerUrl, projectId);
      await server.connect();
      
      // Store in connection pool
      this.connectionPool.set(projectId, server);
      
      return server;
    } catch (error) {
      console.error("Failed to create default MCP server:", error);
      return null;
    }
  }
  
  /**
   * Get a connection for a project - either existing or create a new one
   */
  public async getConnectionForProject(projectId: string): Promise<MCPServer | null> {
    const existingServer = await this.getServerForProject(projectId);
    
    if (existingServer) {
      return existingServer;
    }
    
    return this.createDefaultServer(projectId);
  }
  
  /**
   * Create a default MCP connection
   * @deprecated Use createDefaultServer instead
   */
  public async createDefaultConnection(projectId: string): Promise<MCPServer | null> {
    return this.createDefaultServer(projectId);
  }
  
  /**
   * Close an MCP connection for a project
   */
  public async closeConnection(projectId: string): Promise<void> {
    if (this.connectionPool.has(projectId)) {
      const server = this.connectionPool.get(projectId)!;
      
      try {
        await server.cleanup();
        this.connectionPool.delete(projectId);
      } catch (error) {
        console.error("Error closing MCP connection:", error);
      }
    }
  }
  
  /**
   * Close all active connections
   */
  public async closeAllConnections(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [projectId, server] of this.connectionPool.entries()) {
      promises.push(
        server.cleanup()
          .catch(err => console.error(`Error closing connection for project ${projectId}:`, err))
      );
    }
    
    await Promise.all(promises);
    this.connectionPool.clear();
  }
  
  /**
   * Get an existing connection record from the database
   */
  private async getExistingConnection(projectId: string): Promise<MCPConnectionRecord | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        console.error("No authenticated user found");
        return null;
      }
      
      const { data, error } = await supabase
        .from('mcp_connections')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .order('last_connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching MCP connection:", error);
        return null;
      }
      
      return data as MCPConnectionRecord;
    } catch (error) {
      console.error("Error in getExistingConnection:", error);
      return null;
    }
  }
  
  /**
   * Create an MCPServer from a connection record
   */
  private createServerFromConnection(connection: MCPConnectionRecord): MCPServer {
    return new MCPServerService(connection.connectionUrl, connection.projectId);
  }
}
