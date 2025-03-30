
import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MCPService } from "@/services/mcp/MCPService";
import { TracingService } from "@/services/tracing/TracingService";

interface UseMcpToolOptions {
  fallbackFn?: (params: any) => Promise<any>;
  showToasts?: boolean;
  projectId?: string;
  sceneId?: string;
  recordAnalytics?: boolean;
}

export function useMcpTool(toolName: string, options: UseMcpToolOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { useMcp } = useMCPContext();
  
  const { 
    fallbackFn, 
    showToasts = true, 
    projectId, 
    sceneId, 
    recordAnalytics = true 
  } = options;
  
  // Function to record tool usage in analytics
  const recordToolUsage = useCallback(async (
    success: boolean, 
    result?: any, 
    errorMessage?: string
  ) => {
    if (!recordAnalytics || !projectId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      // Use the tracing service to record the tool usage
      const tracingService = TracingService.getInstance();
      
      if (!tracingService.isActive()) {
        tracingService.startTrace({
          userId: userData.user.id,
          agentType: 'tool',
          projectId
        });
      }
      
      tracingService.addEvent('tool_execution', {
        toolName,
        projectId,
        sceneId,
        success,
        errorMessage
      });
      
      await tracingService.endTrace({
        success,
        userMessage: `Execute ${toolName}`,
        assistantResponse: success ? 
          `Successfully executed ${toolName}` : 
          `Failed to execute ${toolName}: ${errorMessage}`,
        toolCalls: 1
      });
      
    } catch (err) {
      console.error("Failed to record tool usage:", err);
    }
  }, [toolName, projectId, sceneId, recordAnalytics]);
  
  const executeTool = useCallback(async (params: any) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // If MCP is disabled, use fallback
      if (!useMcp) {
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
      
      // Add projectId and sceneId to params if provided in options but not in params
      const finalParams = {
        ...params,
        projectId: params.projectId || projectId,
        sceneId: params.sceneId || sceneId
      };
      
      // Get MCP service and connection
      const mcpService = MCPService.getInstance();
      
      // Try to get connection for this project
      const connection = projectId 
        ? await mcpService.getConnectionForProject(projectId)
        : null;
        
      if (!connection) {
        if (projectId) {
          // Try to create a new connection
          const newConnection = await mcpService.createDefaultConnection(projectId);
          
          if (!newConnection) {
            throw new Error("Failed to establish MCP connection");
          }
          
          // Call the tool through the connection
          const result = await newConnection.callTool(toolName, finalParams);
          setLastResult(result);
          
          // Record the successful tool usage
          await recordToolUsage(true, result);
          
          return result;
        } else if (fallbackFn) {
          // No project ID and no connection, but we have a fallback
          if (showToasts) {
            toast.info("Using fallback method (No MCP connection)");
          }
          
          const result = await fallbackFn(finalParams);
          setLastResult(result);
          
          // Record the fallback usage
          await recordToolUsage(true, result);
          
          return result;
        } else {
          throw new Error("No MCP connection available and no fallback provided");
        }
      }
      
      // Call the tool through the established connection
      const result = await connection.callTool(toolName, finalParams);
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
  }, [toolName, mcpService, useMcp, fallbackFn, showToasts, projectId, sceneId, recordToolUsage]);
  
  return {
    executeTool,
    isExecuting,
    lastResult,
    error,
    resetError: () => setError(null)
  };
}
