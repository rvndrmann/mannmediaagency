
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPContext {
  status: ConnectionStatus;
  reconnectToMcp: () => void;
  lastError: Error | null;
  mcpTools: any[];
  registerTool: (tool: any) => void;
  unregisterTool: (toolId: string) => void;
}

const defaultValue: MCPContext = {
  status: 'disconnected',
  reconnectToMcp: () => {},
  lastError: null,
  mcpTools: [],
  registerTool: () => {},
  unregisterTool: () => {}
};

const MCPContext = createContext<MCPContext>(defaultValue);

export function useMCPContext() {
  return useContext(MCPContext);
}

interface MCPProviderProps {
  children: ReactNode;
}

export function MCPProvider({ children }: MCPProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // Attempt to connect to MCP on component mount
  useEffect(() => {
    attemptConnection();
  }, []);

  const attemptConnection = async () => {
    setStatus('connecting');

    try {
      // Simulate MCP connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would be an actual connection to MCP
      // For now we'll just set it to connected
      setStatus('connected');
      setLastError(null);
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error : new Error('Unknown error connecting to MCP'));
    }
  };

  const reconnectToMcp = () => {
    if (status === 'connecting') return;
    attemptConnection();
  };

  const registerTool = (tool: any) => {
    setMcpTools(prev => [...prev, tool]);
  };

  const unregisterTool = (toolId: string) => {
    setMcpTools(prev => prev.filter(tool => tool.id !== toolId));
  };

  const value = {
    status,
    reconnectToMcp,
    lastError,
    mcpTools,
    registerTool,
    unregisterTool
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
}
