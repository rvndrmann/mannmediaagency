
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MCPTool, MCPResponse, MCPConnectionStats, MCPContext as MCPContextType } from '@/types/mcp';

// Create the context
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
});

interface MCPProviderProps {
  children: ReactNode;
  projectId?: string;
}

export const MCPProvider: React.FC<MCPProviderProps> = ({ children, projectId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [connectionStats, setConnectionStats] = useState<MCPConnectionStats>({
    totalClients: 0,
    connectedClients: 0,
    lastConnectionAttempt: 0
  });
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId);

  // Initialize connection based on projectId
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
      connectToMCP(projectId);
    }
    
    return () => {
      // Cleanup when unmounting
      disconnectFromMCP();
    };
  }, [projectId]);

  // Connect to MCP service
  const connectToMCP = async (projectId: string): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      setConnectionStats(prev => ({
        ...prev,
        lastConnectionAttempt: Date.now()
      }));
      
      // Call MCP service to initialize
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          operation: 'connect',
          projectId
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Update connection status
      setIsConnected(true);
      setConnectionStatus('connected');
      setConnectionStats({
        totalClients: data?.totalClients || 1,
        connectedClients: data?.connectedClients || 1,
        lastConnectionAttempt: Date.now()
      });
      
      // Get available tools
      await listAvailableTools();
      
      return true;
    } catch (error) {
      console.error('Error connecting to MCP:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      return false;
    }
  };
  
  // Disconnect from MCP service
  const disconnectFromMCP = () => {
    // If we have a projectId, call the disconnect endpoint
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
  
  // List available tools
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
  
  // Call a tool
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
  
  // Create context value
  const contextValue: MCPContextType = {
    isConnected,
    connectionStatus,
    connectionStats,
    availableTools,
    connectToMCP,
    disconnectFromMCP,
    listAvailableTools,
    callTool
  };
  
  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
};

// Custom hook for using the MCP context
export const useMCP = () => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
};

// Add an alias export for useMCPContext that points to useMCP
export const useMCPContext = useMCP;

// Export the reconnect function directly
export const reconnectToMcp = () => {
  const context = useMCP();
  return context.connectToMCP;
};
