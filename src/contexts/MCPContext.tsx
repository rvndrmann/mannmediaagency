import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { MCPContext as MCPContextType } from "@/types/mcp";
import { MCPServer } from "@/types/mcp";
import { toast } from "sonner";
import { MCPService } from "@/services/mcp/MCPService";

const defaultMCPContext: MCPContextType = {
  mcpServers: [],
  useMcp: true,
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

const MCPContext = createContext<MCPContextType>(defaultMCPContext);

export function MCPProvider({ children, projectId }: { children: ReactNode, projectId?: string }) {
  const [useMcp, setUseMcp] = useState<boolean>(() => {
    const savedPref = localStorage.getItem('useMcp');
    return savedPref !== null ? savedPref === 'true' : true;
  });
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const [lastReconnectTime, setLastReconnectTime] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionMetrics, setConnectionMetrics] = useState({
    successCount: 0,
    failureCount: 0,
    averageConnectTime: 0
  });
  
  const reconnectingRef = useRef<boolean>(false);
  const healthCheckTimerRef = useRef<number | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  
  const mcpService = MCPService.getInstance();
  
  useEffect(() => {
    localStorage.setItem('useMcp', String(useMcp));
    
    if (!useMcp) {
      setHasConnectionError(false);
      setMcpServers([]);
      setConnectionStatus('disconnected');
    }
  }, [useMcp]);
  
  useEffect(() => {
    return () => {
      if (healthCheckTimerRef.current !== null) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, []);
  
  const connectToMcp = useCallback(async (projectIdentifier?: string, retry = 0): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      setConnectionStatus('disconnected');
      return false;
    }
    
    if (reconnectingRef.current) {
      console.log("Connection attempt already in progress, ignoring duplicate request");
      return false;
    }
    
    reconnectingRef.current = true;
    setIsConnecting(true);
    setHasConnectionError(false);
    setConnectionStatus('connecting');
    
    connectionStartTimeRef.current = performance.now();
    
    const backoffTime = Math.min(
      CONNECTION_CONFIG.initialBackoff * Math.pow(2, retry),
      CONNECTION_CONFIG.maxBackoff
    );
    
    console.log(`Connecting to MCP server for project ${projectIdentifier}, attempt ${retry + 1}`);
    
    try {
      const connectionPromise = mcpService.getServerForProject(projectIdentifier);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection timeout after ${CONNECTION_CONFIG.connectionTimeout}ms`));
        }, CONNECTION_CONFIG.connectionTimeout);
      });
      
      const server = await Promise.race([connectionPromise, timeoutPromise]) as MCPServer | null;
      
      if (!server) {
        console.log("No existing MCP server found, creating default server");
        const newServer = await mcpService.createDefaultServer(projectIdentifier);
        
        if (newServer && newServer.isConnected()) {
          setMcpServers([newServer]);
          setIsConnecting(false);
          setConnectionAttempts(0);
          setConnectionStatus('connected');
          console.log("MCP connection established successfully");
          
          const connectTime = performance.now() - connectionStartTimeRef.current;
          setConnectionMetrics(prev => {
            const newSuccessCount = prev.successCount + 1;
            const newAvgTime = ((prev.averageConnectTime * prev.successCount) + connectTime) / newSuccessCount;
            return {
              successCount: newSuccessCount,
              failureCount: prev.failureCount,
              averageConnectTime: newAvgTime
            };
          });
          
          reconnectingRef.current = false;
          setupHealthCheck([newServer]);
          return true;
        } else {
          throw new Error("Failed to establish MCP connection");
        }
      } else if (!server.isConnected()) {
        console.log("Found MCP server but not connected, connecting now");
        await server.connect();
      }
      
      const tools = await server.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([server]);
      setIsConnecting(false);
      setConnectionAttempts(0);
      setConnectionStatus('connected');
      
      const connectTime = performance.now() - connectionStartTimeRef.current;
      setConnectionMetrics(prev => {
        const newSuccessCount = prev.successCount + 1;
        const newAvgTime = ((prev.averageConnectTime * prev.successCount) + connectTime) / newSuccessCount;
        return {
          successCount: newSuccessCount,
          failureCount: prev.failureCount,
          averageConnectTime: newAvgTime
        };
      });
      
      reconnectingRef.current = false;
      setupHealthCheck([server]);
      return true;
    } catch (error) {
      console.error(`MCP connection attempt ${retry + 1} failed:`, error);
      
      setConnectionMetrics(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1
      }));
      
      if (retry < CONNECTION_CONFIG.maxRetries - 1) {
        console.log(`Retrying MCP connection in ${backoffTime}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        setIsConnecting(false);
        reconnectingRef.current = false;
        
        return connectToMcp(projectIdentifier, retry + 1);
      }
      
      setMcpServers([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      setConnectionAttempts(prev => prev + 1);
      setConnectionStatus('error');
      reconnectingRef.current = false;
      
      if (connectionAttempts < 2) {
        toast.error("Failed to connect to MCP services after multiple attempts. Some AI features may be limited.");
      }
      return false;
    }
  }, [useMcp, mcpService, connectionAttempts]);
  
  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    if (projectId) {
      const now = Date.now();
      const timeSinceLastReconnect = now - lastReconnectTime;
      
      if (timeSinceLastReconnect < CONNECTION_CONFIG.minReconnectInterval) {
        console.log(`Ignoring reconnect request, last attempt was ${timeSinceLastReconnect}ms ago`);
        toast.info("Please wait before trying to reconnect again");
        return false;
      }
      
      if (isConnecting || reconnectingRef.current) {
        toast.info("Connection attempt already in progress");
        return false;
      }
      
      setLastReconnectTime(now);
      toast.loading("Attempting to connect to MCP services...", { id: "mcp-connect" });
      const success = await connectToMcp(projectId);
      
      if (success) {
        toast.success("Connected to MCP services successfully", { id: "mcp-connect" });
      } else {
        toast.error("Failed to connect to MCP services. Using fallback mode.", { id: "mcp-connect" });
      }
      return success;
    }
    return false;
  }, [projectId, connectToMcp, isConnecting, lastReconnectTime]);
  
  const setupHealthCheck = useCallback((servers: MCPServer[]) => {
    if (healthCheckTimerRef.current !== null) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    if (!servers.length || !projectId) return;
    
    healthCheckTimerRef.current = window.setInterval(() => {
      const server = servers[0];
      
      if (server && !server.isConnectionActive()) {
        console.log("MCP connection health check failed, connection is inactive");
        setHasConnectionError(true);
        setConnectionStatus('error');
        
        if (!reconnectingRef.current && !isConnecting) {
          console.log("Auto-reconnecting to MCP after detecting inactive connection");
          setTimeout(() => {
            reconnectToMcp().catch(err => {
              console.error("Auto-reconnect error:", err);
            });
          }, 0);
        }
      }
    }, CONNECTION_CONFIG.healthCheckInterval);
    
    return () => {
      if (healthCheckTimerRef.current !== null) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [projectId, isConnecting, reconnectToMcp]);
  
  useEffect(() => {
    if (projectId && useMcp && !reconnectingRef.current) {
      setTimeout(() => {
        connectToMcp(projectId)
          .catch(err => console.error("Error in initial MCP connection:", err));
      }, 0);
    } else {
      setMcpServers([]);
      if (projectId) {
        console.log("MCP is disabled for project:", projectId);
      }
    }
    
    return () => {
      if (projectId) {
        mcpService.closeConnection(projectId).catch(console.error);
      }
      
      if (healthCheckTimerRef.current !== null) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [useMcp, projectId, connectToMcp, mcpService, setupHealthCheck]);
  
  const contextValue: MCPContextType = {
    mcpServers, 
    useMcp, 
    setUseMcp, 
    isConnecting, 
    hasConnectionError,
    reconnectToMcp,
    lastReconnectAttempt: lastReconnectTime,
    connectionStatus,
    connectionMetrics
  };
  
  return (
    <MCPContext.Provider value={contextValue}>
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
