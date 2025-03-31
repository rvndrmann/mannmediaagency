
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  MCPTool, 
  MCPResponse, 
  MCPConnectionStats, 
  MCPContext as MCPContextType,
  MCPConnectionMetrics,
  MCPServer
} from '@/types/mcp';

const MCPContext = createContext<MCPContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  connectionStats: {
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  },
  availableTools: [],
  connectToMCP: async () => false,
  disconnectFromMCP: () => {},
  listAvailableTools: async () => [],
  callTool: async () => ({ success: false }),
  mcpServers: [],
  useMcp: false,
  setUseMcp: () => {},
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: async () => false,
  lastReconnectAttempt: 0,
  connectionMetrics: {
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0
  }
});

interface MCPProviderProps {
  children: ReactNode;
  projectId?: string;
}

export const MCPProvider: React.FC<MCPProviderProps> = ({ children, projectId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionStats, setConnectionStats] = useState<MCPConnectionStats>({
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  });
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId);
  const [useMcp, setUseMcp] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState(0);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [connectionMetrics, setConnectionMetrics] = useState<MCPConnectionMetrics>({
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0
  });

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
      connectToMCP(projectId);
    }
    
    return () => {
      disconnectFromMCP();
    };
  }, [projectId]);

  const connectToMCP = async (projectId: string): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      setIsConnecting(true);
      setHasConnectionError(false);
      
      const startTime = Date.now();
      setConnectionStats(prev => ({
        ...prev,
        lastConnectionAttempt: startTime
      }));
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: 'connect',
          projectId
        }
      });
      
      if (error) {
        throw error;
      }
      
      setIsConnected(true);
      setConnectionStatus('connected');
      setConnectionStats({
        totalClients: data?.totalClients || 1,
        connectedClients: data?.connectedClients || 1,
        lastConnectionAttempt: startTime
      });
      
      const endTime = Date.now();
      const connectTime = endTime - startTime;
      
      setConnectionMetrics(prev => ({
        successCount: prev.successCount + 1,
        failureCount: prev.failureCount,
        averageConnectTime: prev.successCount === 0 
          ? connectTime 
          : (prev.averageConnectTime * prev.successCount + connectTime) / (prev.successCount + 1),
        lastAttemptTime: endTime
      }));
      
      const mockServer: MCPServer = {
        id: "server-1",
        url: "mcp://localhost:8080",
        updateInterval: 30000,
        isConnected: () => isConnected
      };
      
      setMcpServers([mockServer]);
      
      await listAvailableTools();
      
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error('Error connecting to MCP:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      setHasConnectionError(true);
      
      setConnectionMetrics(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1,
        lastAttemptTime: Date.now()
      }));
      
      setIsConnecting(false);
      return false;
    }
  };
  
  const disconnectFromMCP = () => {
    if (currentProjectId) {
      supabase.functions.invoke('mcp-server', {
        body: {
          operation: 'disconnect',
          projectId: currentProjectId
        }
      }).catch(error => {
        console.error('Error disconnecting from MCP:', error);
      });
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setAvailableTools([]);
  };
  
  const listAvailableTools = async (): Promise<MCPTool[]> => {
    try {
      if (!currentProjectId) {
        return [];
      }
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: 'list_tools',
          projectId: currentProjectId
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.tools && Array.isArray(data.tools)) {
        setAvailableTools(data.tools);
        return data.tools;
      }
      
      return [];
    } catch (error) {
      console.error('Error listing MCP tools:', error);
      return [];
    }
  };
  
  const callTool = async (toolName: string, parameters: any): Promise<MCPResponse> => {
    try {
      if (!currentProjectId || !isConnected) {
        return { 
          success: false, 
          error: 'MCP not connected' 
        };
      }
      
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: 'call_tool',
          toolName,
          parameters,
          projectId: currentProjectId
        }
      });
      
      if (error) {
        throw error;
      }
      
      return data || { success: true };
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };
  
  const reconnectToMcp = async (): Promise<boolean> => {
    setLastReconnectAttempt(Date.now());
    
    if (!currentProjectId) {
      return false;
    }
    
    return connectToMCP(currentProjectId);
  };
  
  const contextValue: MCPContextType = {
    isConnected,
    connectionStatus,
    connectionStats,
    availableTools,
    connectToMCP,
    disconnectFromMCP,
    listAvailableTools,
    callTool,
    mcpServers,
    useMcp,
    setUseMcp,
    isConnecting,
    hasConnectionError,
    reconnectToMcp,
    lastReconnectAttempt,
    connectionMetrics
  };
  
  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
};

export const useMCP = () => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
};

export const useMCPContext = useMCP;

// Export directly from the hook instead of creating a separate function
export const reconnectToMcp = async () => {
  const context = useMCP();
  if (context.reconnectToMcp) {
    return context.reconnectToMcp();
  }
  return false;
};
