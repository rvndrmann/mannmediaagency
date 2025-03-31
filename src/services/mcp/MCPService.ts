import { MCPConnectionStats } from "@/types/mcp";

/**
 * Service for managing MCP (Model Context Protocol) connections
 */
export class MCPService {
  private static connections: Map<string, any> = new Map();
  private static connectionStatus: Map<string, string> = new Map();
  private static connectionStats: MCPConnectionStats = {
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  };

  /**
   * Initialize MCP connections for a project
   */
  public static async initConnections(projectId: string): Promise<boolean> {
    try {
      console.log(`Initializing MCP connections for project ${projectId}`);
      
      // Update connection stats
      this.connectionStats.totalClients += 1;
      this.connectionStats.lastConnectionAttempt = Date.now();
      
      // Simulate successful connection (in a real implementation, this would connect to MCP)
      this.connections.set(projectId, { connected: true });
      this.connectionStatus.set(projectId, 'connected');
      this.connectionStats.connectedClients += 1;
      
      return true;
    } catch (error) {
      console.error("Error initializing MCP connections:", error);
      this.connectionStatus.set(projectId, 'error');
      return false;
    }
  }
  
  /**
   * Close all MCP connections
   */
  public static closeConnections(): void {
    console.log("Closing all MCP connections");
    this.connections.clear();
    this.connectionStatus.clear();
    this.connectionStats.connectedClients = 0;
  }
  
  /**
   * Close a specific MCP connection
   */
  public static closeConnection(projectId: string): void {
    console.log(`Closing MCP connection for project ${projectId}`);
    
    if (this.connections.has(projectId)) {
      this.connections.delete(projectId);
      this.connectionStatus.delete(projectId);
      this.connectionStats.connectedClients = Math.max(0, this.connectionStats.connectedClients - 1);
    }
  }
  
  /**
   * Get the connection for a specific project
   */
  public static getConnectionForProject(projectId: string): any {
    return this.connections.get(projectId);
  }
  
  /**
   * Check if any MCP client is connected
   */
  public static isAnyClientConnected(): boolean {
    return this.connectionStats.connectedClients > 0;
  }
  
  /**
   * Create a default MCP connection
   */
  public static async createDefaultConnection(projectId: string): Promise<any> {
    // If a connection already exists, return it
    if (this.connections.has(projectId)) {
      return this.connections.get(projectId);
    }
    
    // Otherwise create a new connection
    await this.initConnections(projectId);
    return this.connections.get(projectId);
  }
  
  /**
   * Get the connection statistics
   */
  public static getConnectionStats(): MCPConnectionStats {
    return { ...this.connectionStats };
  }
}
