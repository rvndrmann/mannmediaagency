
import { MCPClient } from "./MCPClient";

const servers = [
  {
    id: "mcp-server-01",
    url: process.env.NEXT_PUBLIC_MCP_SERVER_URL || "ws://localhost:8000",
    updateInterval: 30000, // Using a number instead of a string
  },
];

let mcpClients: MCPClient[] = [];

export const getMcpClients = () => {
  return mcpClients;
};

export const initConnections = async (currentProjectId: string): Promise<boolean> => {
  try {
    // Close any existing connections first to prevent duplicates
    await closeConnections();
    
    mcpClients = servers.map((server) => {
      const client = new MCPClient(
        server.id,
        server.url,
        currentProjectId,
        server.updateInterval
      );
      client.connect();
      return client;
    });
    return true;
  } catch (error) {
    console.error("Error initializing MCP connections:", error);
    return false;
  }
};

export const closeConnections = async (): Promise<void> => {
  // Close each client connection
  for (const client of mcpClients) {
    client.close();
  }
  // Clear the clients array
  mcpClients = [];
};
