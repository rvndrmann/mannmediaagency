
import { useState, useCallback, useRef } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPToolDefinition, MCPToolExecutionParams, MCPToolExecutionResult } from "@/types/mcp";
import { toast } from "sonner";

interface UseMcpToolExecutorOptions {
  projectId?: string;
  sceneId?: string;
  showToasts?: boolean;
  onSuccess?: (result: MCPToolExecutionResult) => void;
  onError?: (error: Error) => void;
}

// Cache for recently executed tools to prevent duplicate calls
interface CachedExecution {
  result: MCPToolExecutionResult;
  timestamp: number;
  params: string; // Stringified parameters for comparison
}

const CACHE_EXPIRY = 30000; // 30 seconds

/**
 * A hook that provides easy access to MCP tools with proper connection handling
 */
export function useMcpToolExecutor(options: UseMcpToolExecutorOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, MCPToolExecutionResult>>({});
  const [availableTools, setAvailableTools] = useState<MCPToolDefinition[]>([]);
  const { mcpServers, useMcp, reconnectToMcp, hasConnectionError } = useMCPContext();
  
  // Use a ref for the cache to persist between renders without causing re-renders
  const executionCache = useRef<Record<string, CachedExecution>>({});
  
  const { 
    projectId, 
    sceneId, 
    showToasts = true,
    onSuccess,
    onError
  } = options;
  
  /**
   * Clean expired cache entries
   */
  const cleanCache = useCallback(() => {
    const now = Date.now();
    const newCache: Record<string, CachedExecution> = {};
    
    Object.entries(executionCache.current).forEach(([key, value]) => {
      if (now - value.timestamp < CACHE_EXPIRY) {
        newCache[key] = value;
      }
    });
    
    executionCache.current = newCache;
  }, []);
  
  /**
   * Execute an MCP tool with caching and error handling
   */
  const executeTool = useCallback(async (
    toolName: string, 
    parameters: MCPToolExecutionParams = {}
  ): Promise<MCPToolExecutionResult> => {
    if (isExecuting) {
      console.warn("Another tool execution is already in progress");
    }
    
    setIsExecuting(true);
    
    // Clean expired cache entries
    cleanCache();
    
    try {
      // Check if MCP is enabled and connected
      if (!useMcp || mcpServers.length === 0) {
        const error = new Error("MCP is disabled or not connected");
        if (showToasts) {
          toast.error("MCP is not available. Please enable MCP in settings.");
        }
        if (onError) onError(error);
        return { 
          success: false, 
          error: "MCP is disabled or not connected" 
        };
      }
      
      // If there's a connection error, try to reconnect first
      if (hasConnectionError) {
        if (showToasts) {
          toast.loading("Reconnecting to MCP...");
        }
        
        const reconnected = await reconnectToMcp();
        
        if (!reconnected) {
          const error = new Error("Failed to reconnect to MCP");
          if (showToasts) {
            toast.error("Failed to reconnect to MCP. Please try again later.");
          }
          if (onError) onError(error);
          return { 
            success: false, 
            error: "Failed to reconnect to MCP" 
          };
        }
      }
      
      // Merge provided parameters with default ones
      const fullParameters = {
        ...parameters,
        projectId: parameters.projectId || projectId,
        sceneId: parameters.sceneId || sceneId
      };
      
      // Generate a cache key based on tool name and parameters
      const cacheKey = `${toolName}-${JSON.stringify(fullParameters)}`;
      
      // Check if we have a cached result
      if (executionCache.current[cacheKey]) {
        console.log(`Using cached result for ${toolName}`);
        return executionCache.current[cacheKey].result;
      }
      
      // Show loading toast if enabled
      let toastId;
      if (showToasts) {
        toastId = toast.loading(`Executing ${toolName}...`);
      }
      
      // Get the first available MCP server
      const server = mcpServers[0];
      
      // Execute the tool
      const result = await server.callTool(toolName, fullParameters);
      
      // Cache the result
      executionCache.current[cacheKey] = {
        result,
        timestamp: Date.now(),
        params: JSON.stringify(fullParameters)
      };
      
      // Store the result in state
      setExecutionResults(prev => ({
        ...prev,
        [toolName]: result
      }));
      
      // Show success toast if enabled
      if (showToasts && toastId) {
        toast.success(`${toolName} executed successfully`, {
          id: toastId
        });
      }
      
      // Call success callback if provided
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (error) {
      console.error(`Error executing MCP tool ${toolName}:`, error);
      
      // Show error toast if enabled
      if (showToasts) {
        toast.error(`Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Call error callback if provided
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsExecuting(false);
    }
  }, [
    mcpServers, 
    useMcp, 
    reconnectToMcp, 
    hasConnectionError, 
    projectId, 
    sceneId, 
    showToasts, 
    onSuccess, 
    onError, 
    isExecuting, 
    cleanCache
  ]);
  
  /**
   * Get available tools from connected MCP servers
   */
  const getAvailableTools = useCallback(async (): Promise<MCPToolDefinition[]> => {
    try {
      if (!useMcp || mcpServers.length === 0) {
        return [];
      }
      
      const server = mcpServers[0];
      const tools = await server.listTools();
      setAvailableTools(tools);
      return tools;
    } catch (error) {
      console.error("Error fetching available MCP tools:", error);
      return [];
    }
  }, [mcpServers, useMcp]);
  
  return {
    executeTool,
    getAvailableTools,
    availableTools,
    isExecuting,
    executionResults,
    hasConnection: useMcp && mcpServers.length > 0 && !hasConnectionError,
    clearCache: () => {
      executionCache.current = {};
    }
  };
}
