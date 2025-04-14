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

  const addMcpServer = (server: {
    id: string;
    name: string;
    sseUrl: string;
    toolsUrl: string;
    command?: string;
    args?: string[];
  }) => {
    setMcpServers(prev => {
      const existingServer = prev.find(s => s.name === server.name);
      if (existingServer) {
        return prev;
      }
      return [...prev, {
        ...server,
        updateInterval: 5000, // Placeholder update interval
        isConnected: () => status === 'connected',
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
          const response = await fetch(server.toolsUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          return data;
        }
      },];
    });
  };

  // Attempt to connect to MCP on component mount or when projectId changes
  useEffect(() => {
    if (projectId && useMcp && status === 'disconnected' && !isConnecting) {
      // Add Playwright MCP server
      addMcpServer({
        id: 'playwright-mcp',
        name: 'playwright',
        sseUrl: 'http://localhost:8931/sse',
        toolsUrl: 'http://localhost:8931/tools',
        command: 'npx',
        args: ['@playwright/mcp@latest', '--vision'],
      });

      // Add Browser MCP server
      addMcpServer({
        id: 'browser-mcp',
        name: 'browsermcp',
        sseUrl: 'http://localhost:8931/sse',
        toolsUrl: 'http://localhost:8931/tools',
        command: 'npx',
        args: ['@browsermcp/mcp@latest'],
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

      // Establish SSE connection to MCP server
      const eventSource = new EventSource('http://localhost:8931/sse');

      eventSource.onopen = () => {
        console.log('Connected to MCP server');
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
      };

      eventSource.onerror = (error) => {
        console.error('Failed to connect to MCP:', error);
        setStatus('error');
        let errorMessage = 'Unknown error connecting to MCP';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        setLastError(new Error(errorMessage));

        // Update connection metrics
        setConnectionMetrics(prev => ({
          ...prev,
          failureCount: prev.failureCount + 1,
          lastAttemptTime: Date.now()
        }));

        setIsConnecting(false);
        eventSource.close();
      };

      // You can add event listeners for specific events from the MCP server here
      // eventSource.addEventListener('tool_result', (event) => {
      //   console.log('Tool result:', event.data);
      // });

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

  // Call tool via backend proxy
  const callTool = async (toolName: string, parameters: any) => {
    try {
      console.log(`Calling MCP tool via backend proxy: ${toolName}`, parameters);

      // Target the backend proxy endpoint
      const response = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send toolName and arguments in the expected format for the proxy
        body: JSON.stringify({
          toolName: toolName,
          arguments: parameters,
        }),
      });

      if (!response.ok) {
        // Attempt to read error message from backend response
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not JSON
        }
        const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Tool response from proxy:', data);
      // Assuming the backend proxy returns the direct result from the MCP server
      // which might be nested, e.g. { success: true, data: { ... } }
      // Or it might return the raw MCP response structure { content: [...] }
      // Let's assume for now it returns the structure expected by use-canvas-agent-mcp
      // If the backend proxy returns the raw MCP { content: [...] }, we might need to parse data.content[0].text here
      return data;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName} via proxy:`, error);
      let errorMessage = 'Unknown error calling MCP tool via proxy';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      throw new Error(errorMessage);
    }
  };

  // List available tools
  const listAvailableTools = async (): Promise<MCPTool[]> => {
    // This might need to fetch from a backend endpoint in the future
    // if we want to dynamically list tools from globally configured servers.
    // For now, it returns the internally registered tools (which might be empty/unused).
    console.warn("listAvailableTools currently returns internally registered tools, not from backend proxy.");
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
