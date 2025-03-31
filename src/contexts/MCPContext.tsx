
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MCPContext, MCPServer, CONNECTION_CONFIG, MCPProviderProps } from '@/types/mcp';
import { MCPService } from '@/services/mcp/MCPService';

const defaultMCPContext: MCPContext = {
  mcpServers: [],
  useMcp: true, // Default to true to auto-connect
  setUseMcp: () => {},
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: async () => false,
  lastReconnectAttempt: 0,
  connectionStatus: 'disconnected',
  connectionMetrics: {
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0,
  },
  connectionStats: {
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  }
};

const MCPContextInstance = createContext<MCPContext>(defaultMCPContext);

export const useMCPContext = () => useContext(MCPContextInstance);

export const MCPProvider: React.FC<MCPProviderProps> = ({ children, projectId }) => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [useMcp, setUseMcp] = useState(true); // Default to enabled
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionMetrics, setConnectionMetrics] = useState({
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0,
  });
  const [connectionStats, setConnectionStats] = useState({
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  });
  
  useEffect(() => {
    if (projectId && useMcp && !isConnecting && connectionStatus !== 'connected') {
      connectToMcp();
    }
    
    return () => {
      MCPService.closeConnections();
    };
  }, [projectId, useMcp]);
  
  useEffect(() => {
    if (!useMcp) return;
    
    const updateConnectionStats = () => {
      const stats = MCPService.getConnectionStats();
      setConnectionStats(stats);
      
      const isConnected = MCPService.isAnyClientConnected();
      if (isConnected && connectionStatus !== 'connected') {
        setConnectionStatus('connected');
        setHasConnectionError(false);
      } else if (!isConnected && connectionStatus === 'connected') {
        setConnectionStatus('disconnected');
        if (stats.lastConnectionAttempt > 0) {
          reconnectToMcp();
        }
      }
    };
    
    updateConnectionStats();
    const interval = setInterval(updateConnectionStats, 5000);
    
    return () => clearInterval(interval);
  }, [useMcp, connectionStatus]);

  const connectToMcp = async () => {
    if (!projectId) return false;
    
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    const startTime = Date.now();
    
    try {
      const success = await MCPService.initConnections(projectId);
      
      if (success) {
        setConnectionStatus('connected');
        setHasConnectionError(false);
        setConnectionMetrics(prev => ({
          ...prev,
          successCount: prev.successCount + 1,
          averageConnectTime: (prev.averageConnectTime * prev.successCount + (Date.now() - startTime)) / (prev.successCount + 1)
        }));
        const stats = MCPService.getConnectionStats();
        setConnectionStats(stats);
        return true;
      } else {
        throw new Error("Failed to initialize MCP connections");
      }
    } catch (error) {
      console.error("Failed to connect to MCP:", error);
      setHasConnectionError(true);
      setConnectionStatus('error');
      setConnectionMetrics(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1,
      }));
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastReconnectAttempt < CONNECTION_CONFIG.minReconnectInterval) {
      console.log("Reconnect attempt too soon, skipping");
      return false;
    }

    setLastReconnectAttempt(now);
    return connectToMcp();
  }, [lastReconnectAttempt, projectId]);

  return (
    <MCPContextInstance.Provider
      value={{
        mcpServers,
        useMcp,
        setUseMcp,
        isConnecting,
        hasConnectionError,
        reconnectToMcp,
        lastReconnectAttempt,
        connectionStatus,
        connectionMetrics,
        connectionStats
      }}
    >
      {children}
    </MCPContextInstance.Provider>
  );
};
