
import { useState, useCallback, useRef } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPToolExecutionResult } from "@/types/mcp";
import { toast } from "sonner";

interface UseMcpToolOptions {
  projectId?: string;
  sceneId?: string;
  toolName: string;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (result: MCPToolExecutionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * A specialized hook for managing a single MCP tool execution with 
 * optimized status tracking and debounced requests
 */
export function useMcpTool({
  projectId,
  sceneId,
  toolName,
  autoRetry = true,
  maxRetries = 2,
  retryDelay = 1000,
  onSuccess,
  onError
}: UseMcpToolOptions) {
  const { mcpServers, useMcp } = useMCPContext();
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<MCPToolExecutionResult | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Refs for debouncing
  const executionInProgressRef = useRef(false);
  const lastExecutionTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);
  
  // Check if we have a connection to MCP
  const hasConnection = useCallback(() => {
    return useMcp && mcpServers.length > 0 && mcpServers[0]?.isConnected();
  }, [useMcp, mcpServers]);
  
  // Debounced execution to prevent multiple rapid requests
  const debouncedExecute = useCallback((
    params: any = {},
    debounceMs: number = 300
  ): Promise<MCPToolExecutionResult> => {
    return new Promise((resolve, reject) => {
      // Clear any existing timeout
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // Set a new timeout
      debounceTimeoutRef.current = window.setTimeout(() => {
        execute(params).then(resolve).catch(reject);
      }, debounceMs);
    });
  }, []);
  
  // Execute the MCP tool
  const execute = useCallback(async (
    params: any = {}
  ): Promise<MCPToolExecutionResult> => {
    // Prevent multiple simultaneous executions
    if (executionInProgressRef.current) {
      console.log(`Tool execution already in progress for ${toolName}, skipping...`);
      return {
        success: false,
        error: "Tool execution already in progress"
      };
    }
    
    // Check if we're trying to execute too frequently
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTimeRef.current;
    if (timeSinceLastExecution < 200) { // Simple rate limiting
      console.log(`Rate limiting tool execution for ${toolName}, called too frequently`);
      return {
        success: false,
        error: "Rate limiting applied"
      };
    }
    
    // Merge the default params with the provided ones
    const finalParams = {
      ...params,
      projectId: params.projectId || projectId,
      sceneId: params.sceneId || sceneId
    };
    
    // Mark execution as in progress
    executionInProgressRef.current = true;
    setIsExecuting(true);
    lastExecutionTimeRef.current = now;
    
    let attempts = 0;
    let lastAttemptError: Error | null = null;
    
    while (attempts <= maxRetries) {
      try {
        // Check for MCP connection
        if (!hasConnection()) {
          throw new Error("MCP is not connected");
        }
        
        const server = mcpServers[0];
        console.log(`Executing MCP tool ${toolName} (attempt ${attempts + 1}/${maxRetries + 1})`, finalParams);
        
        // Use non-blocking execution with a timeout for early failure detection
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
        
        const result = await server.executeTool(toolName, finalParams);
        clearTimeout(timeoutId);
        
        // Process successful result
        setLastResult(result);
        setLastError(null);
        setIsExecuting(false);
        executionInProgressRef.current = false;
        
        // Call success callback if provided
        if (onSuccess && result.success) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        lastAttemptError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error executing tool ${toolName} (attempt ${attempts + 1}):`, lastAttemptError);
        
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
    console.error(errorMessage, lastAttemptError);
    
    // Set the final error
    setLastError(lastAttemptError);
    setIsExecuting(false);
    executionInProgressRef.current = false;
    
    // Call error callback if provided
    if (onError && lastAttemptError) {
      onError(lastAttemptError);
    }
    
    // Show error toast
    toast.error(`Failed to execute ${toolName.replace(/_/g, ' ')}`);
    
    return {
      success: false,
      error: lastAttemptError?.message || errorMessage
    };
  }, [hasConnection, mcpServers, toolName, projectId, sceneId, autoRetry, maxRetries, retryDelay, onSuccess, onError]);
  
  // Return the API
  return {
    execute,
    debouncedExecute,
    isExecuting,
    lastResult,
    lastError,
    hasConnection: hasConnection()
  };
}
