
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
  retryCount?: number;
}

export function useMcpTool(toolName: string, options: UseMcpToolOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { useMcp, reconnectToMcp } = useMCPContext();
  const mcpService = MCPService.getInstance();
  
  const { 
    fallbackFn, 
    showToasts = true, 
    projectId, 
    sceneId, 
    recordAnalytics = true,
    retryCount = 1
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
  
  const executeTool = useCallback(async (params: any, currentRetry = 0) => {
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
      
      try {
        // Get server for this project
        const server = projectId 
          ? await mcpService.getServerForProject(projectId)
          : null;
          
        if (!server) {
          if (projectId) {
            // Try to create a new server
            const newServer = await mcpService.createDefaultServer(projectId);
            
            if (!newServer) {
              throw new Error("Failed to establish MCP connection");
            }
            
            // Call the tool through the connection
            const result = await newServer.callTool(toolName, finalParams);
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
        const result = await server.callTool(toolName, finalParams);
        setLastResult(result);
        
        // Record the successful tool usage
        await recordToolUsage(true, result);
        
        return result;
      } catch (connectionErr) {
        // Handle connection errors with retry logic
        if (currentRetry < retryCount) {
          if (showToasts) {
            toast.warning(`Connection issue. Retrying (${currentRetry + 1}/${retryCount})...`);
          }
          
          // Try reconnecting to MCP
          await reconnectToMcp();
          
          // Recursive retry
          return executeTool(params, currentRetry + 1);
        }
        
        // If we've exhausted retries, try fallback or throw
        if (fallbackFn) {
          if (showToasts) {
            toast.info("Connection failed. Using fallback method.");
          }
          
          const result = await fallbackFn(finalParams);
          setLastResult(result);
          await recordToolUsage(true, result);
          return result;
        }
        
        throw connectionErr;
      }
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
  }, [
    toolName, 
    useMcp, 
    fallbackFn, 
    showToasts, 
    projectId, 
    sceneId, 
    recordToolUsage, 
    mcpService, 
    reconnectToMcp, 
    retryCount
  ]);
  
  return {
    executeTool,
    isExecuting,
    lastResult,
    error,
    resetError: () => setError(null)
  };
}
