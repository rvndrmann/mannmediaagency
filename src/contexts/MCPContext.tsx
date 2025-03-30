
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPServer, MCPContext as MCPContextType } from "@/types/mcp";
import { MCPServerService } from "@/services/mcpService";
import { toast } from "sonner";

const defaultMCPContext: MCPContextType = {
  mcpServers: [],
  useMcp: true,
  setUseMcp: () => {},
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: () => Promise.resolve(),
};

const MCPContext = createContext<MCPContextType>(defaultMCPContext);

export function MCPProvider({ children, projectId }: { children: ReactNode, projectId?: string }) {
  const [useMcp, setUseMcp] = useState<boolean>(true);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  
  // Function to establish MCP connection
  const connectToMcp = async (projectIdentifier?: string) => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      return;
    }
    
    setIsConnecting(true);
    setHasConnectionError(false);
    
    try {
      const mcpServer = new MCPServerService(`https://api.example.com/mcp/${projectIdentifier}`);
      await mcpServer.connect();
      
      // Verify connection by listing tools
      const tools = await mcpServer.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([mcpServer]);
      setIsConnecting(false);
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      setMcpServers([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      toast.error("Failed to connect to MCP services. Some AI features may be limited.");
    }
  };
  
  // Function to reconnect to MCP (can be called from UI components)
  const reconnectToMcp = async () => {
    if (projectId) {
      await connectToMcp(projectId);
      if (mcpServers.length > 0) {
        toast.success("Reconnected to MCP services successfully");
      }
      return mcpServers.length > 0;
    }
    return false;
  };
  
  // Initialize MCP server when enabled and projectId changes
  useEffect(() => {
    connectToMcp(projectId);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      mcpServers.forEach(server => {
        server.cleanup().catch(console.error);
      });
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
