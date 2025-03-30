
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPContext as MCPContextType } from "@/types/mcp";
import { toast } from "sonner";
import { MCPConnection, MCPService } from "@/services/mcp/MCPService";

const defaultMCPContext: MCPContextType = {
  mcpServers: [],
  useMcp: true,
  setUseMcp: () => {},
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: async () => false,
};

const MCPContext = createContext<MCPContextType>(defaultMCPContext);

export function MCPProvider({ children, projectId }: { children: ReactNode, projectId?: string }) {
  const [useMcp, setUseMcp] = useState<boolean>(true);
  const [mcpConnections, setMcpConnections] = useState<MCPConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const mcpService = MCPService.getInstance();
  
  // Function to establish MCP connection
  const connectToMcp = async (projectIdentifier?: string): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpConnections([]);
      return false;
    }
    
    setIsConnecting(true);
    setHasConnectionError(false);
    
    try {
      // Try to get an existing connection
      const connection = await mcpService.getConnectionForProject(projectIdentifier);
      
      // If no connection found, create a default one
      if (!connection) {
        const newConnection = await mcpService.createDefaultConnection(projectIdentifier);
        
        if (newConnection && newConnection.isConnected()) {
          setMcpConnections([newConnection]);
          setIsConnecting(false);
          return true;
        } else {
          throw new Error("Failed to establish MCP connection");
        }
      } else if (!connection.isConnected()) {
        // Try to connect if not already connected
        await connection.connect();
      }
      
      // Verify connection by listing tools
      const tools = await connection.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpConnections([connection]);
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      setMcpConnections([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      toast.error("Failed to connect to MCP services. Some AI features may be limited.");
      return false;
    }
  };
  
  // Function to reconnect to MCP (can be called from UI components)
  const reconnectToMcp = async (): Promise<boolean> => {
    if (projectId) {
      const success = await connectToMcp(projectId);
      if (success) {
        toast.success("Reconnected to MCP services successfully");
      }
      return success;
    }
    return false;
  };
  
  // Initialize MCP server when enabled and projectId changes
  useEffect(() => {
    if (projectId && useMcp) {
      connectToMcp(projectId);
    } else {
      setMcpConnections([]);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (projectId) {
        mcpService.closeConnection(projectId).catch(console.error);
      }
    };
  }, [useMcp, projectId]);
  
  return (
    <MCPContext.Provider value={{ 
      mcpServers: mcpConnections, 
      useMcp, 
      setUseMcp, 
      isConnecting, 
      hasConnectionError,
      reconnectToMcp 
    }}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCPContext() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error("useMCPContext must be used within a MCPProvider");
  }
  return context;
}
