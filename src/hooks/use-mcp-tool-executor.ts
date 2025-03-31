
import { useState, useCallback } from 'react';
import { useMCPContext } from '@/contexts/MCPContext';

interface UseMcpToolExecutorProps {
  projectId?: string;
  sceneId?: string;
}

interface MCPToolExecutionParams {
  tool_id: string;
  parameters: Record<string, any>;
}

/**
 * Hook for executing MCP tools with error handling and loading state
 */
export const useMcpToolExecutor = ({
  projectId,
  sceneId
}: UseMcpToolExecutorProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const { mcpServers } = useMCPContext();
  
  /**
   * Execute a tool with the given parameters
   */
  const executeTool = useCallback(async (
    toolName: string, 
    params: MCPToolExecutionParams
  ) => {
    if (!mcpServers.length || !mcpServers[0].isConnected()) {
      const error = new Error('MCP not connected');
      setLastError(error);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    setIsExecuting(true);
    setLastError(null);
    
    try {
      // For this implementation, we'll simulate the call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = {
        success: true,
        result: `Result from ${toolName} operation on scene ${params.parameters?.sceneId || sceneId || 'unknown'}`
      };
      
      setLastResult(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setLastError(err);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsExecuting(false);
    }
  }, [mcpServers, sceneId]);
  
  /**
   * Execute a tool with debouncing
   */
  const debouncedExecute = useCallback(async (params: Record<string, any> = {}) => {
    // Simple implementation that just adds a delay
    // In a real implementation, this would prevent multiple rapid calls
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return executeTool('debounced_tool', {
      tool_id: 'debounced_tool',
      parameters: {
        ...params,
        projectId,
        sceneId
      }
    });
  }, [executeTool, projectId, sceneId]);
  
  return {
    executeTool,
    debouncedExecute,
    isExecuting,
    lastResult,
    lastError
  };
};
