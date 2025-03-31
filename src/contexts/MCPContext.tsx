
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MCPContext, MCPServer, CONNECTION_CONFIG } from '@/types/mcp';

const defaultMCPContext: MCPContext = {
  mcpServers: [],
  useMcp: false,
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
  }
};

const MCPContextInstance = createContext<MCPContext>(defaultMCPContext);

export const useMCPContext = () => useContext(MCPContextInstance);

interface MCPProviderProps {
  children: React.ReactNode;
}

export const MCPProvider: React.FC<MCPProviderProps> = ({ children }) => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [useMcp, setUseMcp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionMetrics, setConnectionMetrics] = useState({
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0,
  });

  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastReconnectAttempt < CONNECTION_CONFIG.minReconnectInterval) {
      console.log("Reconnect attempt too soon, skipping");
      return false;
    }

    setLastReconnectAttempt(now);
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Placeholder for actual reconnection logic
      // This would be implemented with your actual MCP reconnection code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConnectionStatus('connected');
      setHasConnectionError(false);
      setConnectionMetrics(prev => ({
        ...prev,
        successCount: prev.successCount + 1,
      }));
      return true;
    } catch (error) {
      console.error("Failed to reconnect to MCP:", error);
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
  }, [lastReconnectAttempt]);

  // Auto reconnect on useMcp change
  useEffect(() => {
    if (useMcp) {
      reconnectToMcp();
    } else {
      // Disconnect logic would go here
      setConnectionStatus('disconnected');
    }
  }, [useMcp, reconnectToMcp]);

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
      }}
    >
      {children}
    </MCPContextInstance.Provider>
  );
};
