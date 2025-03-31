
import { useState, useCallback, useEffect, useRef } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { useMcpTool } from "@/hooks/use-mcp-tool";
import { toast } from "sonner";

interface UseOptimizedCanvasMcpOptions {
  projectId?: string;
  sceneId?: string;
  autoConnect?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Optimized hook for using MCP tools in the Canvas context
 * with improved connection handling, non-blocking operations and error recovery
 */
export function useOptimizedCanvasMcp(options: UseOptimizedCanvasMcpOptions = {}) {
  const { 
    projectId, 
    sceneId, 
    autoConnect = true,
    retryDelay = 1500,
    maxRetries = 3
  } = options;
  
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Use memoized refs instead of state for operation tracking to avoid re-renders
  const operationStateRef = useRef({
    isGeneratingDescription: false,
    isGeneratingImagePrompt: false,
    isGeneratingImage: false, 
    isGeneratingVideo: false,
    isGeneratingScript: false
  });
  
  // Track previous scene and project IDs
  const prevSceneIdRef = useRef<string | undefined>(sceneId);
  const prevProjectIdRef = useRef<string | undefined>(projectId);
  
  const { mcpServers, useMcp, reconnectToMcp, hasConnectionError, isConnecting } = useMCPContext();
  
  // Create MCP tool hooks with optimized behavior
  const descriptionTool = useMcpTool({
    projectId,
    sceneId,
    toolName: "update_scene_description",
    onSuccess: () => {
      operationStateRef.current.isGeneratingDescription = false;
    },
    onError: (error) => {
      operationStateRef.current.isGeneratingDescription = false;
      setLastError(error);
    }
  });
  
  const imagePromptTool = useMcpTool({
    projectId,
    sceneId,
    toolName: "update_image_prompt",
    onSuccess: () => {
      operationStateRef.current.isGeneratingImagePrompt = false;
    },
    onError: (error) => {
      operationStateRef.current.isGeneratingImagePrompt = false;
      setLastError(error);
    }
  });
  
  const imageTool = useMcpTool({
    projectId,
    sceneId,
    toolName: "generate_scene_image",
    onSuccess: () => {
      operationStateRef.current.isGeneratingImage = false;
    },
    onError: (error) => {
      operationStateRef.current.isGeneratingImage = false;
      setLastError(error);
    }
  });
  
  const videoTool = useMcpTool({
    projectId,
    sceneId,
    toolName: "create_scene_video",
    onSuccess: () => {
      operationStateRef.current.isGeneratingVideo = false;
    },
    onError: (error) => {
      operationStateRef.current.isGeneratingVideo = false;
      setLastError(error);
    }
  });
  
  const scriptTool = useMcpTool({
    projectId,
    sceneId,
    toolName: "generate_scene_script",
    onSuccess: () => {
      operationStateRef.current.isGeneratingScript = false;
    },
    onError: (error) => {
      operationStateRef.current.isGeneratingScript = false;
      setLastError(error);
    }
  });
  
  // Clear error when connection status changes
  useEffect(() => {
    // Automatically clear error when we have a connection
    if (mcpServers.length > 0 && mcpServers[0].isConnected() && lastError) {
      setLastError(null);
    }
  }, [mcpServers, lastError]);
  
  // Auto-connect to MCP with non-blocking behavior
  useEffect(() => {
    // Only attempt auto-connection when projectId changes or on initial load
    if (autoConnect && projectId && useMcp && 
        (mcpServers.length === 0 || prevProjectIdRef.current !== projectId)) {
      console.log("Auto-connecting to MCP for project:", projectId);
      
      const connectWithBackoff = async () => {
        // Skip if we're already auto-reconnecting
        if (isAutoReconnecting) return;
        
        setIsAutoReconnecting(true);
        try {
          // Use a non-blocking timeout to avoid freezing the UI
          await new Promise(resolve => setTimeout(resolve, 0));
          const success = await reconnectToMcp();
          
          if (success) {
            console.log("Auto-connect succeeded");
            setRetryCount(0);
          } else if (retryCount < maxRetries) {
            console.log(`Auto-connect failed, will retry (${retryCount + 1}/${maxRetries})`);
            // Schedule a retry with exponential backoff
            const backoffDelay = retryDelay * Math.pow(1.5, retryCount);
            setTimeout(() => setRetryCount(count => count + 1), backoffDelay);
          } else {
            console.log("Auto-connect failed after max retries");
            setRetryCount(0);
          }
        } catch (err) {
          console.error("Auto-connect failed:", err);
        } finally {
          setIsAutoReconnecting(false);
        }
      };
      
      // Start connection attempt in a non-blocking way
      setTimeout(connectWithBackoff, 0);
    }
    
    prevProjectIdRef.current = projectId;
  }, [autoConnect, projectId, useMcp, mcpServers.length, reconnectToMcp, retryCount, maxRetries, retryDelay, isAutoReconnecting]);
  
  // Reset processing states on connection errors or scene changes
  useEffect(() => {
    // Reset when connection is lost
    if (hasConnectionError && !isConnecting) {
      operationStateRef.current = {
        isGeneratingDescription: false,
        isGeneratingImagePrompt: false,
        isGeneratingImage: false,
        isGeneratingVideo: false,
        isGeneratingScript: false
      };
    }
    
    // Reset when scene changes
    if (prevSceneIdRef.current !== sceneId && prevSceneIdRef.current !== undefined) {
      console.log(`Scene changed from ${prevSceneIdRef.current} to ${sceneId}`);
      
      operationStateRef.current = {
        isGeneratingDescription: false,
        isGeneratingImagePrompt: false,
        isGeneratingImage: false,
        isGeneratingVideo: false,
        isGeneratingScript: false
      };
    }
    
    prevSceneIdRef.current = sceneId;
  }, [hasConnectionError, isConnecting, sceneId]);
  
  // Update scene description with non-blocking behavior
  const updateSceneDescription = useCallback(async (sceneId: string, imageAnalysis: boolean = true): Promise<boolean> => {
    if (!sceneId || operationStateRef.current.isGeneratingDescription) return false;
    
    operationStateRef.current.isGeneratingDescription = true;
    setLastError(null);
    
    const result = await descriptionTool.execute({
      sceneId,
      imageAnalysis
    });
    
    return result.success;
  }, [descriptionTool]);
  
  // Generate and update image prompt
  const updateImagePrompt = useCallback(async (sceneId: string, useDescription: boolean = true): Promise<boolean> => {
    if (!sceneId || operationStateRef.current.isGeneratingImagePrompt) return false;
    
    operationStateRef.current.isGeneratingImagePrompt = true;
    setLastError(null);
    
    const result = await imagePromptTool.debouncedExecute({
      sceneId,
      useDescription
    });
    
    return result.success;
  }, [imagePromptTool]);
  
  // Generate scene image with non-blocking behavior
  const generateImage = useCallback(async (sceneId: string, productShotVersion: string = "v2"): Promise<boolean> => {
    if (!sceneId || operationStateRef.current.isGeneratingImage) return false;
    
    operationStateRef.current.isGeneratingImage = true;
    setLastError(null);
    
    const result = await imageTool.execute({
      sceneId,
      productShotVersion
    });
    
    return result.success;
  }, [imageTool]);
  
  // Generate scene video
  const generateVideo = useCallback(async (sceneId: string, aspectRatio: string = "16:9"): Promise<boolean> => {
    if (!sceneId || operationStateRef.current.isGeneratingVideo) return false;
    
    operationStateRef.current.isGeneratingVideo = true;
    setLastError(null);
    
    const result = await videoTool.execute({
      sceneId,
      aspectRatio
    });
    
    return result.success;
  }, [videoTool]);
  
  // Generate scene script
  const generateScript = useCallback(async (sceneId: string, contextPrompt: string = ""): Promise<boolean> => {
    if (!sceneId || operationStateRef.current.isGeneratingScript) return false;
    
    operationStateRef.current.isGeneratingScript = true;
    setLastError(null);
    
    const result = await scriptTool.execute({
      sceneId,
      contextPrompt
    });
    
    return result.success;
  }, [scriptTool]);
  
  // Generic tool execution function
  const executeTool = useCallback(async (name: string, params: any = {}): Promise<any> => {
    if (!mcpServers.length || !mcpServers[0].isConnected()) {
      toast.error("MCP not connected. Please connect first.");
      return { success: false, error: "MCP not connected" };
    }
    
    try {
      return await mcpServers[0].executeTool(name, {
        ...params,
        projectId: params.projectId || projectId,
        sceneId: params.sceneId || sceneId
      });
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      setLastError(error instanceof Error ? error : new Error(String(error)));
      toast.error(`Failed to execute ${name.replace(/_/g, ' ')}`);
      return { success: false, error: String(error) };
    }
  }, [mcpServers, projectId, sceneId]);
  
  // Return object with optimized properties (not state-based to prevent re-renders)
  return {
    // Connection status
    isConnected: mcpServers.length > 0 && mcpServers[0]?.isConnected(),
    isProcessing: isConnecting || isAutoReconnecting || 
                 descriptionTool.isExecuting || imagePromptTool.isExecuting || 
                 imageTool.isExecuting || videoTool.isExecuting || scriptTool.isExecuting,
    
    // Operation status (derived from refs - doesn't cause re-renders)
    isGeneratingDescription: descriptionTool.isExecuting,
    isGeneratingImagePrompt: imagePromptTool.isExecuting,
    isGeneratingImage: imageTool.isExecuting,
    isGeneratingVideo: videoTool.isExecuting,
    isGeneratingScript: scriptTool.isExecuting,
    isAutoReconnecting,
    connectionError: hasConnectionError && !isConnecting,
    lastError,
    
    // Actions
    updateSceneDescription,
    updateImagePrompt,
    generateImage,
    generateVideo,
    generateScript,
    
    // Direct tool execution
    executeTool,
    
    // Utilities
    reconnectMcp: reconnectToMcp
  };
}
