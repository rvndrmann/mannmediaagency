
import { useState, useCallback, useRef, useEffect } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPToolDefinition, MCPToolExecutionParams, MCPToolExecutionResult } from "@/types/mcp";
import { toast } from "sonner";

interface UseMcpToolExecutorOptions {
  projectId?: string;
  sceneId?: string;
  showToasts?: boolean;
  cacheTime?: number; // Time in ms to cache results
  onSuccess?: (result: MCPToolExecutionResult) => void;
  onError?: (error: Error) => void;
}

// Cache for recently executed tools to prevent duplicate calls
interface CachedExecution {
  result: MCPToolExecutionResult;
  timestamp: number;
  params: string; // Stringified parameters for comparison
}

// Default cache expiry time
const DEFAULT_CACHE_EXPIRY = 30000; // 30 seconds

/**
 * A hook that provides easy access to MCP tools with proper connection handling
 * and result caching for better performance
 */
export function useMcpToolExecutor(options: UseMcpToolExecutorOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, MCPToolExecutionResult>>({});
  const [availableTools, setAvailableTools] = useState<MCPToolDefinition[]>([]);
  const { mcpServers, useMcp, reconnectToMcp, hasConnectionError } = useMCPContext();
  
  // Use a ref for the cache to persist between renders without causing re-renders
  const executionCache = useRef<Record<string, CachedExecution>>({});
  const pendingExecutions = useRef<Record<string, Promise<MCPToolExecutionResult>>>({});
  const cleanupTimerRef = useRef<number | null>(null);
  
  const { 
    projectId, 
    sceneId, 
    showToasts = true,
    cacheTime = DEFAULT_CACHE_EXPIRY,
    onSuccess,
    onError
  } = options;
  
  /**
   * Clean expired cache entries periodically
   */
  useEffect(() => {
    // Set up a timer to clean the cache periodically
    const cleanCacheInterval = window.setInterval(() => {
      cleanCache();
    }, cacheTime / 2); // Clean at half the cache expiry time
    
    cleanupTimerRef.current = cleanCacheInterval;
    
    return () => {
      if (cleanupTimerRef.current !== null) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [cacheTime]);
  
  /**
   * Clean expired cache entries
   */
  const cleanCache = useCallback(() => {
    const now = Date.now();
    const newCache: Record<string, CachedExecution> = {};
    
    Object.entries(executionCache.current).forEach(([key, value]) => {
      if (now - value.timestamp < cacheTime) {
        newCache[key] = value;
      }
    });
    
    executionCache.current = newCache;
  }, [cacheTime]);
  
  /**
   * Clear the cache - useful when changing scenes or projects
   */
  const clearCache = useCallback(() => {
    console.log("Clearing MCP tool execution cache");
    executionCache.current = {};
  }, []);
  
  /**
   * Execute an MCP tool with caching, deduplication, and error handling
   */
  const executeTool = useCallback(async (
    toolName: string, 
    parameters: MCPToolExecutionParams = {}
  ): Promise<MCPToolExecutionResult> => {
    // Only show warning if another execution is in progress for the same tool
    if (isExecuting && pendingExecutions.current[toolName]) {
      console.warn(`Another execution of ${toolName} is already in progress`);
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
          toast.loading("Reconnecting to MCP...", { id: "mcp-reconnect" });
        }
        
        try {
          const reconnected = await reconnectToMcp();
          
          if (!reconnected) {
            const error = new Error("Failed to reconnect to MCP");
            if (showToasts) {
              toast.error("Failed to reconnect to MCP. Please try again later.", { id: "mcp-reconnect" });
            }
            if (onError) onError(error);
            return { 
              success: false, 
              error: "Failed to reconnect to MCP" 
            };
          } else if (showToasts) {
            toast.success("Reconnected to MCP successfully", { id: "mcp-reconnect" });
          }
        } catch (error) {
          console.error("Error during MCP reconnection:", error);
          if (showToasts) {
            toast.error("Error during MCP reconnection", { id: "mcp-reconnect" });
          }
          if (onError) onError(error instanceof Error ? error : new Error(String(error)));
          return {
            success: false,
            error: "Error during MCP reconnection"
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
        const cachedResult = executionCache.current[cacheKey].result;
        
        // Still call the success callback with cached results
        if (onSuccess) onSuccess(cachedResult);
        
        return cachedResult;
      }
      
      // Check if we already have a pending execution for this exact request
      if (pendingExecutions.current[cacheKey]) {
        console.log(`Reusing pending execution for ${toolName}`);
        return pendingExecutions.current[cacheKey];
      }
      
      // Show loading toast if enabled
      let toastId;
      if (showToasts) {
        toastId = toast.loading(`Executing ${toolName}...`);
      }
      
      // Create a new execution promise and store it
      const executionPromise = (async () => {
        try {
          // Get the first available MCP server
          const server = mcpServers[0];
          
          // Execute the tool with timeout handling
          const executionTimeout = 60000; // 60 seconds timeout for tool execution
          const executionPromise = server.callTool(toolName, fullParameters);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Tool execution timed out after ${executionTimeout}ms`)), executionTimeout);
          });
          
          const result = await Promise.race([executionPromise, timeoutPromise]);
          
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
          if (showToasts && toastId) {
            toast.error(`Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`, {
              id: toastId
            });
          } else if (showToasts) {
            toast.error(`Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Call error callback if provided
          if (onError) onError(error instanceof Error ? error : new Error(String(error)));
          
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        } finally {
          // Remove from pending executions
          delete pendingExecutions.current[cacheKey];
          
          // Only set isExecuting to false if no other executions are pending
          if (Object.keys(pendingExecutions.current).length === 0) {
            setIsExecuting(false);
          }
        }
      })();
      
      // Store the promise so we can reuse it
      pendingExecutions.current[cacheKey] = executionPromise;
      
      return executionPromise;
    } catch (error) {
      console.error(`Error setting up MCP tool execution for ${toolName}:`, error);
      setIsExecuting(false);
      
      // Show error toast if enabled
      if (showToasts) {
        toast.error(`Failed to set up tool execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Call error callback if provided
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        error: "Failed to set up tool execution"
      };
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
   * Get available tools from connected MCP servers with caching
   */
  const getAvailableTools = useCallback(async (): Promise<MCPToolDefinition[]> => {
    try {
      if (!useMcp || mcpServers.length === 0) {
        return [];
      }
      
      // If we already have tools cached in state, return them
      if (availableTools.length > 0) {
        return availableTools;
      }
      
      const server = mcpServers[0];
      const tools = await server.listTools();
      setAvailableTools(tools);
      return tools;
    } catch (error) {
      console.error("Error fetching available MCP tools:", error);
      return [];
    }
  }, [mcpServers, useMcp, availableTools]);
  
  return {
    executeTool,
    getAvailableTools,
    availableTools,
    isExecuting,
    executionResults,
    hasConnection: useMcp && mcpServers.length > 0 && !hasConnectionError,
    clearCache
  };
}
