
import { useState, useCallback, useMemo, useRef } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPToolDefinition, MCPToolExecutionParams, MCPToolExecutionResult } from "@/types/mcp";
import { toast } from "sonner";

// Interface for tool executor options
interface ToolExecutorOptions {
  projectId?: string;
  sceneId?: string;
  cacheResults?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Interface for execution result
interface ToolExecutionState {
  isExecuting: boolean;
  lastResult: MCPToolExecutionResult | null;
  error: Error | null;
  toolName: string | null;
}

// Define a type for the cache
type ToolResultCache = Map<string, MCPToolExecutionResult>;

/**
 * Hook for executing MCP tools with caching, retry logic, and error handling
 */
export function useMcpToolExecutor(options: ToolExecutorOptions = {}) {
  const {
    projectId,
    sceneId,
    cacheResults = true,
    autoRetry = true,
    maxRetries = 2,
    retryDelay = 1000
  } = options;

  const { mcpServers, useMcp } = useMCPContext();
  const [executionState, setExecutionState] = useState<ToolExecutionState>({
    isExecuting: false,
    lastResult: null,
    error: null,
    toolName: null
  });

  // Cache for storing execution results
  const resultsCacheRef = useRef<ToolResultCache>(new Map());
  
  // Track connection state
  const hasConnection = useMemo(() => {
    return useMcp && mcpServers.length > 0 && mcpServers[0].isConnected();
  }, [useMcp, mcpServers]);

  // Clear the cache
  const clearCache = useCallback(() => {
    resultsCacheRef.current.clear();
  }, []);

  // Generate a cache key for a tool execution
  const getCacheKey = useCallback((toolName: string, params: MCPToolExecutionParams) => {
    return `${toolName}-${JSON.stringify(params)}`;
  }, []);

  // Execute an MCP tool with caching and retry logic
  const executeTool = useCallback(
    async (
      toolName: string,
      params: MCPToolExecutionParams = {}
    ): Promise<MCPToolExecutionResult> => {
      // Merge the default params with the provided ones
      const finalParams: MCPToolExecutionParams = {
        ...params,
        projectId: params.projectId || projectId,
        sceneId: params.sceneId || sceneId
      };

      // Check if we have a cached result
      const cacheKey = getCacheKey(toolName, finalParams);
      if (cacheResults && resultsCacheRef.current.has(cacheKey)) {
        const cachedResult = resultsCacheRef.current.get(cacheKey)!;
        console.log(`Using cached result for tool ${toolName}`, cachedResult);
        return cachedResult;
      }

      // Update state to indicate execution is in progress
      setExecutionState({
        isExecuting: true,
        lastResult: null,
        error: null,
        toolName
      });

      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts <= maxRetries) {
        try {
          if (!useMcp || mcpServers.length === 0) {
            throw new Error("MCP is not enabled or no servers available");
          }

          const server = mcpServers[0];
          console.log(`Executing MCP tool ${toolName} (attempt ${attempts + 1}/${maxRetries + 1})`, finalParams);

          const result = await server.executeTool(toolName, finalParams);

          // Cache the successful result
          if (cacheResults && result.success) {
            resultsCacheRef.current.set(cacheKey, result);
          }

          // Update state
          setExecutionState({
            isExecuting: false,
            lastResult: result,
            error: null,
            toolName
          });

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`Error executing tool ${toolName} (attempt ${attempts + 1}):`, lastError);
          
          attempts += 1;
          
          // If we still have retries left, and auto retry is enabled, wait and try again
          if (autoRetry && attempts <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          } else {
            break;
          }
        }
      }

      // All attempts failed
      const errorMessage = `Failed to execute tool ${toolName} after ${attempts} attempts`;
      console.error(errorMessage, lastError);
      
      // Show error toast if we're exhausted all retries
      toast.error(`Failed to execute ${toolName.replace(/_/g, ' ')}`);

      const errorResult: MCPToolExecutionResult = {
        success: false,
        error: lastError?.message || errorMessage
      };

      // Update state
      setExecutionState({
        isExecuting: false,
        lastResult: errorResult,
        error: lastError,
        toolName
      });

      return errorResult;
    },
    [
      projectId,
      sceneId,
      useMcp,
      mcpServers,
      cacheResults,
      autoRetry,
      maxRetries,
      retryDelay,
      getCacheKey
    ]
  );

  return {
    executeTool,
    isExecuting: executionState.isExecuting,
    lastResult: executionState.lastResult,
    currentTool: executionState.toolName,
    error: executionState.error,
    hasConnection,
    clearCache
  };
}
