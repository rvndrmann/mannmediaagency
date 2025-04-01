
export class MCPService {
  private connections: Map<string, string> = new Map();
  
  async connect(url: string, projectId: string): Promise<boolean> {
    try {
      // Simulate connection to MCP server
      console.log(`Connecting to MCP server at ${url} for project ${projectId}`);
      
      // Store the connection URL for this project
      this.connections.set(projectId, url);
      
      return true;
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      return false;
    }
  }
  
  getUrl(projectId: string): string | null {
    return this.connections.get(projectId) || null;
  }
  
  disconnect(projectId: string): boolean {
    return this.connections.delete(projectId);
  }
  
  // Adding missing methods
  connectToServer(url: string, projectId: string): Promise<boolean> {
    return this.connect(url, projectId);
  }
  
  getConnectionUrl(projectId: string): string | null {
    return this.getUrl(projectId);
  }
  
  // Static getInstance method
  static getInstance(): MCPService {
    return new MCPService();
  }
}
