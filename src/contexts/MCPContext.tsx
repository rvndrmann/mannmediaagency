
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { MCPContext as MCPContextType } from "@/types/mcp";
import { toast } from "sonner";
import { MCPService } from "@/services/mcp/MCPService";
import { MCPServer } from "@/types/mcp";

const defaultMCPContext: MCPContextType = {
  mcpServers: [],
  useMcp: true,
  setUseMcp: () => {},
  isConnecting: false,
  hasConnectionError: false,
  reconnectToMcp: async () => false,
};

const MCPContext = createContext<MCPContextType>(defaultMCPContext);

// Configuration for connection attempts
const CONNECTION_CONFIG = {
  maxRetries: 3,
  initialBackoff: 1000, // 1 second
  maxBackoff: 5000, // 5 seconds
  connectionTimeout: 15000, // 15 seconds
  minReconnectInterval: 2000, // 2 seconds minimum between reconnect attempts
  healthCheckInterval: 30000, // 30 seconds
};

export function MCPProvider({ children, projectId }: { children: ReactNode, projectId?: string }) {
  const [useMcp, setUseMcp] = useState<boolean>(() => {
    // Try to load from localStorage for persistence
    const savedPref = localStorage.getItem('useMcp');
    return savedPref !== null ? savedPref === 'true' : true; // Default to true
  });
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const [lastReconnectTime, setLastReconnectTime] = useState<number>(0);
  const reconnectingRef = useRef<boolean>(false);
  const healthCheckTimerRef = useRef<number | null>(null);
  
  const mcpService = MCPService.getInstance();
  
  // Save MCP preference to localStorage
  useEffect(() => {
    localStorage.setItem('useMcp', String(useMcp));
    
    // Clear connection errors when MCP is disabled
    if (!useMcp) {
      setHasConnectionError(false);
      setMcpServers([]);
    }
  }, [useMcp]);
  
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (healthCheckTimerRef.current !== null) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, []);
  
  // Function to establish MCP connection with retry logic
  const connectToMcp = useCallback(async (projectIdentifier?: string, retry = 0): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      return false;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (reconnectingRef.current) {
      console.log("Connection attempt already in progress, ignoring duplicate request");
      return false;
    }
    
    reconnectingRef.current = true;
    setIsConnecting(true);
    setHasConnectionError(false);
    
    // Calculate backoff time with exponential increase
    const backoffTime = Math.min(
      CONNECTION_CONFIG.initialBackoff * Math.pow(2, retry),
      CONNECTION_CONFIG.maxBackoff
    );
    
    console.log(`Connecting to MCP server for project ${projectIdentifier}, attempt ${retry + 1}`);
    
    try {
      // Set a timeout for the connection attempt
      const connectionPromise = mcpService.getServerForProject(projectIdentifier);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection timeout after ${CONNECTION_CONFIG.connectionTimeout}ms`));
        }, CONNECTION_CONFIG.connectionTimeout);
      });
      
      // Race the connection against the timeout
      const server = await Promise.race([connectionPromise, timeoutPromise]) as MCPServer | null;
      
      // If no connection found, create a default one
      if (!server) {
        console.log("No existing MCP server found, creating default server");
        const newServer = await mcpService.createDefaultServer(projectIdentifier);
        
        if (newServer && newServer.isConnected()) {
          setMcpServers([newServer]);
          setIsConnecting(false);
          setConnectionAttempts(0); // Reset connection attempts on success
          console.log("MCP connection established successfully");
          reconnectingRef.current = false;
          setupHealthCheck([newServer]);
          return true;
        } else {
          throw new Error("Failed to establish MCP connection");
        }
      } else if (!server.isConnected()) {
        // Try to connect if not already connected
        console.log("Found MCP server but not connected, connecting now");
        await server.connect();
      }
      
      // Verify connection by listing tools
      const tools = await server.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([server]);
      setIsConnecting(false);
      setConnectionAttempts(0); // Reset connection attempts on success
      reconnectingRef.current = false;
      setupHealthCheck([server]);
      return true;
    } catch (error) {
      console.error(`MCP connection attempt ${retry + 1} failed:`, error);
      
      // Check if we should retry
      if (retry < CONNECTION_CONFIG.maxRetries - 1) {
        console.log(`Retrying MCP connection in ${backoffTime}ms...`);
        
        // Wait for backoff period before retrying
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        setIsConnecting(false);
        reconnectingRef.current = false;
        
        // Recursive retry with incremented retry count
        return connectToMcp(projectIdentifier, retry + 1);
      }
      
      // All retries exhausted
      setMcpServers([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      setConnectionAttempts(prev => prev + 1);
      reconnectingRef.current = false;
      
      // Only show toast for first few attempts to avoid spamming
      if (connectionAttempts < 2) {
        toast.error("Failed to connect to MCP services after multiple attempts. Some AI features may be limited.");
      }
      return false;
    }
  }, [useMcp, mcpService, connectionAttempts]);
  
  // Set up health check monitoring for servers
  const setupHealthCheck = useCallback((servers: MCPServer[]) => {
    // Clear any existing health check timer
    if (healthCheckTimerRef.current !== null) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    if (!servers.length || !projectId) return;
    
    // Set up a new health check interval
    healthCheckTimerRef.current = window.setInterval(() => {
      const server = servers[0];
      
      if (server && !server.isConnectionActive()) {
        console.log("MCP connection health check failed, connection is inactive");
        setHasConnectionError(true);
        
        // Attempt auto-reconnect if we've hit an error
        if (!reconnectingRef.current && !isConnecting) {
          console.log("Auto-reconnecting to MCP after detecting inactive connection");
          reconnectToMcp().catch(console.error);
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
  
  // Function to reconnect to MCP (can be called from UI components)
  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    if (projectId) {
      // Prevent rapid reconnection attempts
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
  
  // Initialize MCP server when enabled and projectId changes
  useEffect(() => {
    if (projectId && useMcp && !reconnectingRef.current) {
      connectToMcp(projectId)
        .catch(err => console.error("Error in initial MCP connection:", err));
    } else {
      setMcpServers([]);
      if (projectId) {
        console.log("MCP is disabled for project:", projectId);
      }
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (projectId) {
        mcpService.closeConnection(projectId).catch(console.error);
      }
      // Clear health check timer
      if (healthCheckTimerRef.current !== null) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [useMcp, projectId, connectToMcp, mcpService, setupHealthCheck]);
  
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
