
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MCPServer, MCPTool, MCPConnectionStats, MCPConnectionMetrics } from '@/types/mcp';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPContext {
  // Current status properties
  status: ConnectionStatus;
  connectionStatus: ConnectionStatus; // Alias for status for compatibility
  isConnecting: boolean;
  hasConnectionError: boolean;
  lastError: Error | null;
  
  // Tools and servers
  mcpTools: any[];
  mcpServers: MCPServer[];
  addMcpServer: (server: MCPServer) => void;
  // Configuration
  useMcp: boolean;
  setUseMcp: (useMcp: boolean) => void;
  
  // Connection management
  reconnectToMcp: () => Promise<boolean>;
  
  // Tool management
  registerTool: (tool: any) => void;
  unregisterTool: (toolId: string) => void;
  
  // Statistics and metrics
  connectionStats: MCPConnectionStats;
  connectionMetrics: MCPConnectionMetrics;
  
  // Additional methods for components
  callTool?: (toolName: string, parameters: any) => Promise<any>;
  listAvailableTools?: () => Promise<MCPTool[]>;
}

const defaultConnectionStats: MCPConnectionStats = {
  totalClients: 0,
  connectedClients: 0,
  lastConnectionAttempt: 0
};

const defaultConnectionMetrics: MCPConnectionMetrics = {
  successCount: 0,
  failureCount: 0,
  averageConnectTime: 0
};

const defaultValue: MCPContext = {
  status: 'disconnected',
  connectionStatus: 'disconnected',
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: async () => false,
  lastError: null,
  mcpTools: [],
  mcpServers: [],
  useMcp: true, // Default to true for better compatibility
  setUseMcp: () => { },
  registerTool: () => { },
  unregisterTool: () => {},
  connectionStats: defaultConnectionStats,
  connectionMetrics: defaultConnectionMetrics,
  addMcpServer: () => { }
};

const MCPContext = createContext<MCPContext>(defaultValue);

export function useMCPContext() {
  return useContext(MCPContext);
}

interface MCPProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function MCPProvider({ children, projectId }: MCPProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [useMcp, setUseMcp] = useState<boolean>(true);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [connectionStats, setConnectionStats] = useState<MCPConnectionStats>(defaultConnectionStats);
  const [connectionMetrics, setConnectionMetrics] = useState<MCPConnectionMetrics>(defaultConnectionMetrics);

  const addMcpServer = (server: MCPServer) => {
    setMcpServers(prev => {
      const existingServer = prev.find(s => s.name === server.name);
      if (existingServer) {
        return prev;
      }
      return [...prev, server];
    });
  };

  // Attempt to connect to MCP on component mount or when projectId changes
  useEffect(() => {
    if (projectId && useMcp && status === 'disconnected' && !isConnecting) {
      // Add Playwright MCP server
      addMcpServer({
        id: 'playwright-mcp',
        name: 'playwright',
        url: 'http://localhost:8931/sse', // Placeholder URL
        updateInterval: 5000, // Placeholder update interval
        command: 'npx',
        args: ['@playwright/mcp@latest', '--vision'],
        isConnected: () => true, // Mock isConnected for now
        executeTool: async (toolName: string, params: any) => {
          console.log(`Executing Playwright MCP tool: ${toolName}`, params);
          // Simulate a delay
          await new Promise(resolve => setTimeout(resolve, 500));

          // Mock response
          return {
            success: true,
            result: `Successfully called tool ${toolName} on Playwright MCP`,
          };
        },
        listTools: async () => {
          return []; // Mock listTools for now
        }
      });
      attemptConnection();
    }
    // We only want to attempt connection when these dependencies change
  }, [projectId, useMcp, status, isConnecting, addMcpServer]);

  const attemptConnection = async () => {
    if (isConnecting) return false;
    
    setIsConnecting(true);
    setStatus('connecting');
    
    try {
      // Update connection attempt timestamp
      setConnectionStats(prev => ({
        ...prev,
        lastConnectionAttempt: Date.now()
      }));

      // Simulate MCP connection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, this would be an actual connection to MCP
      setStatus('connected');
      setLastError(null);
      
      // Update connection metrics
      setConnectionMetrics(prev => ({
        ...prev,
        successCount: prev.successCount + 1,
        lastAttemptTime: Date.now(),
        averageConnectTime: 
          (prev.averageConnectTime * prev.successCount + 500) / (prev.successCount + 1)
      }));
      
      // Update connection stats
      setConnectionStats(prev => ({
        ...prev,
        connectedClients: prev.connectedClients + 1,
        totalClients: prev.totalClients + 1
      }));
      
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error : new Error('Unknown error connecting to MCP'));
      
      // Update connection metrics
      setConnectionMetrics(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1,
        lastAttemptTime: Date.now()
      }));
      
      setIsConnecting(false);
      return false;
    }
  };

  const reconnectToMcp = async (): Promise<boolean> => {
    if (isConnecting) return false;
    
    // First reset the status
    setStatus('disconnected');
    
    // Then attempt connection
    return attemptConnection();
  };

  const registerTool = (tool: any) => {
    setMcpTools(prev => {
      // Check if tool already exists
      const existingTool = prev.find(t => t.id === tool.id || t.name === tool.name);
      if (existingTool) {
        return prev; // Tool already registered
      }
      return [...prev, tool];
    });
  };

  const unregisterTool = (toolId: string) => {
    setMcpTools(prev => prev.filter(tool => tool.id !== toolId && tool.name !== toolId));
  };
  
  // Simulate tool calling
  const callTool = async (toolName: string, parameters: any) => {
    try {
      console.log(`Calling MCP tool: ${toolName}`, parameters);
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock response
      return {
        success: true,
        result: {
          message: `Successfully called tool ${toolName}`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  };
  
  // List available tools
  const listAvailableTools = async (): Promise<MCPTool[]> => {
    return mcpTools;
  };

  const hasConnectionError = status === 'error';

  const value: MCPContext = {
    status,
    connectionStatus: status, // Alias for compatibility
    isConnecting,
    hasConnectionError,
    reconnectToMcp,
    lastError,
    mcpTools,
    mcpServers,
    addMcpServer,
    useMcp,
    setUseMcp,
    registerTool,
    unregisterTool,
    connectionStats,
    connectionMetrics,
    callTool,
    listAvailableTools
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
}
