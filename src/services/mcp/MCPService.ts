import { MCPClient } from "./MCPClient";

const servers = [
  {
    id: "mcp-server-01",
    url: process.env.NEXT_PUBLIC_MCP_SERVER_URL || "ws://localhost:8000",
    updateInterval: process.env.NEXT_PUBLIC_SERVER_UPDATE_INTERVAL || "30000",
  },
];

let mcpClients: MCPClient[] = [];

export const getMcpClients = () => {
  return mcpClients;
};

export const initConnections = async (currentProjectId: string): Promise<boolean> => {
  try {
    // Convert the server update interval from string to number
    const serverUpdateIntervalMs = 30000; // Use a hardcoded number value instead of a string
    
    mcpClients = servers.map((server) => {
      const client = new MCPClient(
        server.id,
        server.url,
        currentProjectId,
        serverUpdateIntervalMs
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
  mcpClients.forEach((client) => {
    client.close();
  });
  mcpClients = [];
};
