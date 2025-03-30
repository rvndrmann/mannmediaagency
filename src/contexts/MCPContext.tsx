
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPContext as MCPContextType } from "@/types/mcp";
import { toast } from "sonner";
import { MCPService } from "@/services/mcp/MCPService";
import { MCPServer } from "@/services/mcp/types";

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
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const mcpService = MCPService.getInstance();
  
  // Function to establish MCP connection
  const connectToMcp = async (projectIdentifier?: string): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      return false;
    }
    
    setIsConnecting(true);
    setHasConnectionError(false);
    
    try {
      // Try to get an existing connection
      const server = await mcpService.getServerForProject(projectIdentifier);
      
      // If no connection found, create a default one
      if (!server) {
        const newServer = await mcpService.createDefaultServer(projectIdentifier);
        
        if (newServer && newServer.isConnected()) {
          setMcpServers([newServer]);
          setIsConnecting(false);
          return true;
        } else {
          throw new Error("Failed to establish MCP connection");
        }
      } else if (!server.isConnected()) {
        // Try to connect if not already connected
        await server.connect();
      }
      
      // Verify connection by listing tools
      const tools = await server.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([server]);
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      setMcpServers([]);
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
      setMcpServers([]);
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
      mcpServers, 
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
