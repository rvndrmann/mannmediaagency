
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPServer, MCPContext as MCPContextType } from "@/types/mcp";
import { MCPServerService } from "@/services/mcpService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Function to establish MCP connection
  const connectToMcp = async (projectIdentifier?: string): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      return false;
    }
    
    setIsConnecting(true);
    setHasConnectionError(false);
    
    try {
      // First check if we have a stored connection URL for this project
      let serverUrl = `https://api.browser-use.com/mcp/${projectIdentifier}`;
      
      if (projectIdentifier) {
        const { data, error } = await supabase
          .from('mcp_connections')
          .select('connection_url')
          .eq('project_id', projectIdentifier)
          .eq('is_active', true)
          .order('last_connected_at', { ascending: false })
          .maybeSingle();
          
        if (data && !error) {
          serverUrl = data.connection_url;
        }
      }
      
      // Create and connect to the MCP server
      const mcpServer = new MCPServerService(serverUrl, projectIdentifier);
      await mcpServer.connect();
      
      // Verify connection by listing tools
      const tools = await mcpServer.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([mcpServer]);
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
