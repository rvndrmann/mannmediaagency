
import { useState, useCallback } from "react";
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

/**
 * A hook that provides easy access to MCP tools with proper connection handling
 */
export function useMcpToolExecutor(options: UseMcpToolExecutorOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, MCPToolExecutionResult>>({});
  const { mcpServers, useMcp, reconnectToMcp, hasConnectionError } = useMCPContext();
  
  const { 
    projectId, 
    sceneId, 
    showToasts = true,
    onSuccess,
    onError
  } = options;
  
  const executeTool = useCallback(async (
    toolName: string, 
    parameters: MCPToolExecutionParams = {}
  ): Promise<MCPToolExecutionResult> => {
    setIsExecuting(true);
    
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
      
      // Get the first available MCP server
      const server = mcpServers[0];
      
      // Merge provided parameters with default ones
      const fullParameters = {
        ...parameters,
        projectId: parameters.projectId || projectId,
        sceneId: parameters.sceneId || sceneId
      };
      
      // Show loading toast if enabled
      let toastId;
      if (showToasts) {
        toastId = toast.loading(`Executing ${toolName}...`);
      }
      
      // Execute the tool
      const result = await server.callTool(toolName, fullParameters);
      
      // Store the result
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
  }, [mcpServers, useMcp, reconnectToMcp, hasConnectionError, projectId, sceneId, showToasts, onSuccess, onError]);
  
  /**
   * Get available tools from connected MCP servers
   */
  const getAvailableTools = useCallback(async (): Promise<MCPToolDefinition[]> => {
    try {
      if (!useMcp || mcpServers.length === 0) {
        return [];
      }
      
      const server = mcpServers[0];
      return await server.listTools();
    } catch (error) {
      console.error("Error fetching available MCP tools:", error);
      return [];
    }
  }, [mcpServers, useMcp]);
  
  return {
    executeTool,
    getAvailableTools,
    isExecuting,
    executionResults,
    hasConnection: useMcp && mcpServers.length > 0 && !hasConnectionError
  };
}
