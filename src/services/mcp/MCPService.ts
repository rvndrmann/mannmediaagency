
import { MCPClient } from "./MCPClient";

const servers = [
  {
    id: "mcp-server-01",
    url: process.env.NEXT_PUBLIC_MCP_SERVER_URL || "ws://localhost:8000",
    updateInterval: 30000, // Using a number instead of a string
  },
];

let mcpClients: MCPClient[] = [];
let isInitializing = false;
let lastInitTime = 0;
const MIN_RECONNECT_INTERVAL = 5000; // 5 seconds between reconnect attempts

class MCPServiceClass {
  getMcpClients() {
    return mcpClients;
  }

  async initConnections(currentProjectId: string): Promise<boolean> {
    // Prevent multiple simultaneous init calls
    if (isInitializing) {
      console.log("MCP connections already initializing, skipping");
      return false;
    }
    
    // Prevent too frequent reconnection attempts
    const now = Date.now();
    if (now - lastInitTime < MIN_RECONNECT_INTERVAL) {
      console.log(`Too soon to reconnect (${now - lastInitTime}ms), minimum interval is ${MIN_RECONNECT_INTERVAL}ms`);
      return false;
    }
    
    try {
      isInitializing = true;
      lastInitTime = now;
      
      // Close any existing connections first to prevent duplicates
      await this.closeConnections();
      
      console.log(`Initializing MCP connections for project ${currentProjectId}`);
      
      mcpClients = servers.map((server) => {
        const client = new MCPClient(
          server.id,
          server.url,
          currentProjectId,
          server.updateInterval
        );
        // Start connection with proper error handling
        client.connect();
        
        // Add event listeners for better monitoring
        client.on('connected', (data) => {
          console.log(`MCP client ${data.clientId} connected successfully`);
        });
        
        client.on('disconnected', (data) => {
          console.log(`MCP client ${data.clientId} disconnected with code ${data.code}`);
        });
        
        client.on('error', (data) => {
          console.error(`MCP client ${data.clientId} encountered an error:`, data.error);
        });
        
        return client;
      });
      
      return true;
    } catch (error) {
      console.error("Error initializing MCP connections:", error);
      return false;
    } finally {
      isInitializing = false;
    }
  }

  async closeConnections(): Promise<void> {
    // Close each client connection
    for (const client of mcpClients) {
      try {
        client.close();
      } catch (error) {
        console.error(`Error closing MCP client ${client.id}:`, error);
      }
    }
    // Clear the clients array
    mcpClients = [];
  }

  // Check if any client is connected
  isAnyClientConnected(): boolean {
    return mcpClients.some(client => client.isConnected());
  }
  
  // Singleton instance
  private static instance: MCPServiceClass;
  
  public static getInstance(): MCPServiceClass {
    if (!MCPServiceClass.instance) {
      MCPServiceClass.instance = new MCPServiceClass();
    }
    return MCPServiceClass.instance;
  }
}

// Create the singleton instance
const mcpServiceInstance = MCPServiceClass.getInstance();

// Export for backward compatibility
export const MCPService = {
  getMcpClients: () => mcpServiceInstance.getMcpClients(),
  initConnections: (currentProjectId: string) => mcpServiceInstance.initConnections(currentProjectId),
  closeConnections: () => mcpServiceInstance.closeConnections(),
  isAnyClientConnected: () => mcpServiceInstance.isAnyClientConnected(),
  getInstance: () => mcpServiceInstance
};

// Type export for other modules
export type MCPServiceType = typeof MCPServiceClass.prototype;
