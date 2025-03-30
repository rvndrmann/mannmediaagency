
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  connectionTimeout: 10000, // 10 seconds
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
  const mcpService = MCPService.getInstance();
  
  // Save MCP preference to localStorage
  useEffect(() => {
    localStorage.setItem('useMcp', String(useMcp));
  }, [useMcp]);
  
  // Function to establish MCP connection with retry logic
  const connectToMcp = useCallback(async (projectIdentifier?: string, retry = 0): Promise<boolean> => {
    if (!projectIdentifier || !useMcp) {
      setMcpServers([]);
      return false;
    }
    
    setIsConnecting(true);
    setHasConnectionError(false);
    
    // Calculate backoff time with exponential increase
    const backoffTime = Math.min(
      CONNECTION_CONFIG.initialBackoff * Math.pow(2, retry),
      CONNECTION_CONFIG.maxBackoff
    );
    
    try {
      // Set a timeout for the connection attempt
      const connectionPromise = mcpService.getServerForProject(projectIdentifier);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, CONNECTION_CONFIG.connectionTimeout);
      });
      
      // Race the connection against the timeout
      const server = await Promise.race([connectionPromise, timeoutPromise]) as MCPServer | null;
      
      // If no connection found, create a default one
      if (!server) {
        const newServer = await mcpService.createDefaultServer(projectIdentifier);
        
        if (newServer && newServer.isConnected()) {
          setMcpServers([newServer]);
          setIsConnecting(false);
          setConnectionAttempts(0); // Reset connection attempts on success
          console.log("MCP connection established successfully");
          return true;
        } else {
          throw new Error("Failed to establish MCP connection");
        }
      } else if (!server.isConnected()) {
        // Try to connect if not already connected
        await server.connect();
      }
      
      // Verify connection by listing tools
      const tools = await server.listTools();
      console.log("MCP Connected successfully, found tools:", tools.length);
      
      setMcpServers([server]);
      setIsConnecting(false);
      setConnectionAttempts(0); // Reset connection attempts on success
      return true;
    } catch (error) {
      console.error(`MCP connection attempt ${retry + 1} failed:`, error);
      
      // Check if we should retry
      if (retry < CONNECTION_CONFIG.maxRetries - 1) {
        console.log(`Retrying MCP connection in ${backoffTime}ms...`);
        
        // Wait for backoff period before retrying
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Recursive retry with incremented retry count
        return connectToMcp(projectIdentifier, retry + 1);
      }
      
      // All retries exhausted
      setMcpServers([]);
      setIsConnecting(false);
      setHasConnectionError(true);
      setConnectionAttempts(prev => prev + 1);
      
      // Only show toast for first few attempts to avoid spamming
      if (connectionAttempts < 2) {
        toast.error("Failed to connect to MCP services after multiple attempts. Some AI features may be limited.");
      }
      return false;
    }
  }, [useMcp, mcpService, connectionAttempts]);
  
  // Function to reconnect to MCP (can be called from UI components)
  const reconnectToMcp = useCallback(async (): Promise<boolean> => {
    if (projectId) {
      if (isConnecting) {
        toast.info("Connection attempt already in progress");
        return false;
      }
      
      toast.loading("Attempting to connect to MCP services...");
      const success = await connectToMcp(projectId);
      
      if (success) {
        toast.success("Connected to MCP services successfully");
      } else {
        toast.error("Failed to connect to MCP services. Using fallback mode.");
      }
      return success;
    }
    return false;
  }, [projectId, connectToMcp, isConnecting]);
  
  // Initialize MCP server when enabled and projectId changes
  useEffect(() => {
    if (projectId && useMcp) {
      connectToMcp(projectId);
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
    };
  }, [useMcp, projectId, connectToMcp]);
  
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
