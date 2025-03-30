
import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UseMcpToolOptions {
  fallbackFn?: (params: any) => Promise<any>;
  showToasts?: boolean;
  projectId?: string;
  sceneId?: string;
}

export function useMcpTool(toolName: string, options: UseMcpToolOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { mcpServers, useMcp } = useMCPContext();
  
  const { fallbackFn, showToasts = true, projectId, sceneId } = options;
  
  // Function to record tool usage in analytics
  const recordToolUsage = useCallback(async (
    success: boolean, 
    result?: any, 
    errorMessage?: string
  ) => {
    if (!projectId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      await supabase.from('agent_interactions').insert({
        user_id: userData.user.id,
        agent_type: 'mcp',
        user_message: `Execute ${toolName}`,
        assistant_response: success ? 
          `Successfully executed ${toolName}` : 
          `Failed to execute ${toolName}: ${errorMessage}`,
        metadata: {
          tool: toolName,
          projectId,
          sceneId,
          result: result || null,
          error: errorMessage || null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Failed to record tool usage:", err);
    }
  }, [toolName, projectId, sceneId]);
  
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
        
        // Record the fallback usage
        await recordToolUsage(true, result);
        
        return result;
      }
      
      // Use first available MCP server
      const server = mcpServers[0];
      
      // Add sceneId to params if provided in options but not in params
      const finalParams = {
        ...params,
        sceneId: params.sceneId || sceneId
      };
      
      const result = await server.callTool(toolName, finalParams);
      
      setLastResult(result);
      
      // Record the successful tool usage
      await recordToolUsage(true, result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (showToasts) {
        toast.error(`Error executing ${toolName}: ${error.message}`);
      }
      
      // Record the failed tool usage
      await recordToolUsage(false, null, error.message);
      
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [toolName, mcpServers, useMcp, fallbackFn, showToasts, sceneId, recordToolUsage]);
  
  return {
    executeTool,
    isExecuting,
    lastResult,
    error,
    resetError: () => setError(null)
  };
}
