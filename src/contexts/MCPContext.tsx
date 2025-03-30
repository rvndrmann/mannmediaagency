
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPServer, MCPContext } from "@/types/mcp";
import { MCPServerService } from "@/services/mcpService";

const defaultMCPContext: MCPContext = {
  mcpServers: [],
  useMcp: true,
  setUseMcp: () => {},
};

const MCPContext = createContext<MCPContext>(defaultMCPContext);

export function MCPProvider({ children, projectId }: { children: ReactNode, projectId?: string }) {
  const [useMcp, setUseMcp] = useState<boolean>(true);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);

  // Initialize MCP server when enabled and projectId changes
  useEffect(() => {
    let mcpServer: MCPServerService | null = null;
    
    const initServer = async () => {
      if (useMcp && projectId) {
        mcpServer = new MCPServerService(`https://api.example.com/mcp/${projectId}`);
        try {
          await mcpServer.connect();
          setMcpServers([mcpServer]);
        } catch (error) {
          console.error("Failed to connect to MCP server:", error);
          setMcpServers([]);
        }
      } else {
        setMcpServers([]);
      }
    };
    
    initServer();
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (mcpServer) {
        mcpServer.cleanup().catch(console.error);
      }
    };
  }, [useMcp, projectId]);
  
  return (
    <MCPContext.Provider value={{ mcpServers, useMcp, setUseMcp }}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCPContext() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCPContext must be used within a MCPProvider");
  }
  return context;
}
