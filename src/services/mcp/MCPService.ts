
import { MCPClient } from "./MCPClient";

// Use browser-compatible environment variable access
const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL || 
                        (typeof window !== 'undefined' && window.__env?.MCP_SERVER_URL) || 
                        "ws://localhost:8000";

const servers = [
  {
    id: "mcp-server-01",
    url: MCP_SERVER_URL,
    updateInterval: 30000,
  },
];

// Connection pool management
let mcpClients: MCPClient[] = [];
let isInitializing = false;
let lastInitTime = 0;
const MIN_RECONNECT_INTERVAL = 5000; // 5 seconds between reconnect attempts
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 10000; // 10 seconds timeout

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
      
      // Connection timeout promise
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), CONNECTION_TIMEOUT);
      });
      
      // Create clients with proper connection tracking
      const clientPromises = servers.map(async (server) => {
        const client = new MCPClient(
          server.id,
          server.url,
          currentProjectId,
          server.updateInterval
        );
        
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
        
        // Connect with proper connection tracking
        const connectPromise = new Promise<boolean>((resolve) => {
          client.on('connected', () => resolve(true));
          client.on('error', () => resolve(false));
          client.connect();
        });
        
        // Wait for connection with timeout
        try {
          const connected = await Promise.race([connectPromise, timeoutPromise]);
          if (connected) {
            mcpClients.push(client);
            return true;
          }
          return false;
        } catch (error) {
          console.error(`Connection timeout for client ${client.id}`);
          client.close();
          return false;
        }
      });
      
      // Wait for all clients to connect with exponential backoff retry
      let attempt = 0;
      while (attempt < MAX_RECONNECT_ATTEMPTS) {
        try {
          const results = await Promise.all(clientPromises);
          const success = results.some(result => result === true);
          
          if (success) {
            console.log('Successfully connected to at least one MCP server');
            return true;
          }
          
          attempt++;
          if (attempt < MAX_RECONNECT_ATTEMPTS) {
            const backoffTime = Math.pow(2, attempt) * 1000;
            console.log(`Retrying connection attempt ${attempt+1}/${MAX_RECONNECT_ATTEMPTS} after ${backoffTime}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        } catch (error) {
          console.error('Error during connection attempt:', error);
          attempt++;
        }
      }
      
      console.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      return false;
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
  
  // Get connection statistics
  getConnectionStats() {
    return {
      totalClients: mcpClients.length,
      connectedClients: mcpClients.filter(client => client.isConnected()).length,
      lastConnectionAttempt: lastInitTime,
    };
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
  getConnectionStats: () => mcpServiceInstance.getConnectionStats(),
  getInstance: () => mcpServiceInstance
};

// Type export for other modules
export type MCPServiceType = typeof MCPServiceClass.prototype;
