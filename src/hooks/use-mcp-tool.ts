
import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";

interface UseMcpToolOptions {
  fallbackFn?: (params: any) => Promise<any>;
  showToasts?: boolean;
}

export function useMcpTool(toolName: string, options: UseMcpToolOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { mcpServers, useMcp } = useMCPContext();
  
  const { fallbackFn, showToasts = true } = options;
  
  const executeTool = useCallback(async (params: any) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // If MCP is disabled or no servers available, use fallback
      if (!useMcp || mcpServers.length === 0) {
        if (!fallbackFn) {
          throw new Error(`MCP is disabled and no fallback function provided for ${toolName}`);
        }
        
        if (showToasts) {
          toast.info("Using fallback method (MCP unavailable)");
        }
        
        const result = await fallbackFn(params);
        setLastResult(result);
        return result;
      }
      
      // Use first available MCP server
      const server = mcpServers[0];
      const result = await server.callTool(toolName, params);
      
      setLastResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (showToasts) {
        toast.error(`Error executing ${toolName}: ${error.message}`);
      }
      
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [toolName, mcpServers, useMcp, fallbackFn, showToasts]);
  
  return {
    executeTool,
    isExecuting,
    lastResult,
    error,
    resetError: () => setError(null)
  };
}
