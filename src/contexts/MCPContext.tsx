
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPContext as MCPContextType } from "@/types/mcp";
import { toast } from "sonner";
import { MCPService } from "@/services/mcp/MCPService";
import { MCPServer } from "@/types/mcp";

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
  const [useMcp, setUseMcp] = useState<boolean>(() => {
    // Try to load from localStorage for persistence
    const savedPref = localStorage.getItem('useMcp');
    return savedPref !== null ? savedPref === 'true' : true; // Default to true
  });
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const mcpService = MCPService.getInstance();
  
  // Save MCP preference to localStorage
  useEffect(() => {
    localStorage.setItem('useMcp', String(useMcp));
  }, [useMcp]);
  
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
          setConnectionAttempts(0); // Reset connection attempts on success
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
      setConnectionAttempts(0); // Reset connection attempts on success
      return true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      setMcpServers([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      setConnectionAttempts(prev => prev + 1);
      
      // Only show toast for first few attempts to avoid spamming
      if (connectionAttempts < 2) {
        toast.error("Failed to connect to MCP services. Some AI features may be limited.");
      }
      return false;
    }
  };
  
  // Function to reconnect to MCP (can be called from UI components)
  const reconnectToMcp = async (): Promise<boolean> => {
    if (projectId) {
      const success = await connectToMcp(projectId);
      if (success) {
        toast.success("Reconnected to MCP services successfully");
      } else {
        toast.error("Failed to reconnect to MCP services");
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
      if (projectId) {
        console.log("MCP is disabled for project:", projectId);
      }
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
