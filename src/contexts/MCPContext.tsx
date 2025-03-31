
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { MCPContext, MCPServer, MCPConnectionRecord } from '@/types/mcp';

// Define connection status type
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Configuration constants
const CONNECTION_CONFIG = {
  initialBackoff: 1000,
  maxBackoff: 30000,
  maxRetries: 5,
  connectionTimeout: 15000,
  healthCheckInterval: 60000,
  minReconnectInterval: 5000
};

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
    averageConnectTime: 0
  }
};

const MCPContextImpl = createContext<MCPContext>(defaultMCPContext);

export const useMCPContext = () => useContext(MCPContextImpl);

export const MCPContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [useMcp, setUseMcp] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionMetrics, setConnectionMetrics] = useState({
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0
  });

  // Load MCP servers from storage or API
  useEffect(() => {
    // This would typically load servers from an API or storage
    const loadServers = async () => {
      // Mock implementation for now
      console.log('Loading MCP servers would happen here');
    };

    loadServers();
  }, []);

  // Handles reconnection logic with exponential backoff
  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastReconnectAttempt < CONNECTION_CONFIG.minReconnectInterval) {
      console.log('Reconnection attempt too soon, skipping.');
      return false;
    }

    setLastReconnectAttempt(now);
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      // Attempt to connect to all servers
      const results = await Promise.all(
        mcpServers.map(async (server) => {
          const startTime = performance.now();
          const success = await server.connect();
          const endTime = performance.now();
          
          return { 
            server, 
            success, 
            connectionTime: endTime - startTime 
          };
        })
      );
      
      // Update metrics
      const successCount = results.filter(r => r.success).length;
      const totalConnectionTime = results.reduce((sum, r) => r.success ? sum + r.connectionTime : sum, 0);
      const avgConnectionTime = successCount > 0 ? totalConnectionTime / successCount : 0;
      
      setConnectionMetrics(prev => ({
        successCount: prev.successCount + successCount,
        failureCount: prev.failureCount + (results.length - successCount),
        averageConnectTime: avgConnectionTime
      }));
      
      const allConnected = results.every(r => r.success);
      if (allConnected) {
        setConnectionStatus('connected');
        setHasConnectionError(false);
        toast.success('Connected to all MCP servers');
      } else {
        setConnectionStatus('error');
        setHasConnectionError(true);
        toast.error('Failed to connect to some MCP servers');
      }
      
      setIsConnecting(false);
      return allConnected;
    } catch (error) {
      console.error('Error during MCP reconnection:', error);
      setConnectionStatus('error');
      setHasConnectionError(true);
      setIsConnecting(false);
      toast.error('Failed to connect to MCP servers');
      return false;
    }
  }, [mcpServers, lastReconnectAttempt]);

  // Perform health checks on connected servers
  useEffect(() => {
    if (!useMcp || mcpServers.length === 0) return;
    
    const healthCheck = async () => {
      for (const server of mcpServers) {
        if (server.isConnected() && !server.isConnectionActive()) {
          console.warn(`MCP server ${server.id} connection inactive, attempting reconnect`);
          await server.connect();
        }
      }
    };
    
    const interval = setInterval(healthCheck, CONNECTION_CONFIG.healthCheckInterval);
    return () => clearInterval(interval);
  }, [useMcp, mcpServers]);

  // Auto-connect when useMcp is enabled
  useEffect(() => {
    if (useMcp && mcpServers.length > 0 && !isConnecting) {
      reconnectToMcp();
    }
  }, [useMcp, mcpServers, reconnectToMcp, isConnecting]);

  // Cleanup connections on unmount
  useEffect(() => {
    return () => {
      mcpServers.forEach(server => {
        server.disconnect().catch(err => {
          console.error(`Error disconnecting from MCP server ${server.id}:`, err);
        });
      });
    };
  }, [mcpServers]);

  // Automatic reconnection attempts on connection errors
  useEffect(() => {
    if (!useMcp || !hasConnectionError || isConnecting) return;
    
    let retryCount = 0;
    let backoff = CONNECTION_CONFIG.initialBackoff;
    
    const attemptReconnect = async () => {
      if (retryCount >= CONNECTION_CONFIG.maxRetries) {
        console.warn('Maximum MCP reconnection attempts reached');
        return;
      }
      
      retryCount++;
      console.log(`Attempting MCP reconnection (${retryCount}/${CONNECTION_CONFIG.maxRetries}) in ${backoff}ms`);
      
      await new Promise(resolve => setTimeout(resolve, backoff));
      const success = await reconnectToMcp();
      
      if (!success) {
        backoff = Math.min(backoff * 2, CONNECTION_CONFIG.maxBackoff);
        attemptReconnect();
      }
    };
    
    attemptReconnect();
  }, [useMcp, hasConnectionError, isConnecting, reconnectToMcp]);

  return (
    <MCPContextImpl.Provider
      value={{
        mcpServers,
        useMcp,
        setUseMcp,
        isConnecting,
        hasConnectionError,
        reconnectToMcp,
        lastReconnectAttempt,
        connectionStatus,
        connectionMetrics
      }}
    >
      {children}
    </MCPContextImpl.Provider>
  );
};
