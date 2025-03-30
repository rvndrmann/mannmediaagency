import { useState, useCallback, useEffect, useRef } from "react";
import { useMcpToolExecutor } from "./use-mcp-tool-executor";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";

interface UseCanvasMcpOptions {
  projectId?: string;
  sceneId?: string;
  autoConnect?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Hook for using MCP tools in the Canvas context
 * with improved connection handling and error recovery
 */
export function useCanvasMcp(options: UseCanvasMcpOptions = {}) {
  const { 
    projectId, 
    sceneId, 
    autoConnect = true,
    retryDelay = 1500,
    maxRetries = 3
  } = options;
  
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  
  // Add reference to previous scene ID to detect changes
  const prevSceneIdRef = useRef<string | undefined>(sceneId);
  const prevProjectIdRef = useRef<string | undefined>(projectId);
  
  const { mcpServers, useMcp, reconnectToMcp, hasConnectionError, isConnecting } = useMCPContext();
  const { executeTool, isExecuting, hasConnection, clearCache } = useMcpToolExecutor({
    projectId,
    sceneId
  });
  
  // Auto-connect to MCP if enabled
  useEffect(() => {
    // Only attempt auto-connection when projectId changes or on initial load
    if (autoConnect && projectId && useMcp && 
        (mcpServers.length === 0 || prevProjectIdRef.current !== projectId)) {
      console.log("Auto-connecting to MCP for project:", projectId);
      
      setIsAutoReconnecting(true);
      reconnectToMcp()
        .then(success => {
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
        })
        .catch(err => {
          console.error("Auto-connect failed:", err);
        })
        .finally(() => {
          setIsAutoReconnecting(false);
        });
    }
    
    prevProjectIdRef.current = projectId;
  }, [autoConnect, projectId, useMcp, mcpServers.length, reconnectToMcp, retryCount, maxRetries, retryDelay]);
  
  // Handle scene changes - clean up any ongoing operations
  useEffect(() => {
    if (prevSceneIdRef.current !== sceneId && prevSceneIdRef.current !== undefined) {
      console.log(`Scene changed from ${prevSceneIdRef.current} to ${sceneId}`);
      
      // Reset all generation states when scene changes
      setIsGeneratingDescription(false);
      setIsGeneratingImagePrompt(false);
      setIsGeneratingImage(false);
      setIsGeneratingVideo(false);
      setIsGeneratingScript(false);
      
      // Clear the execution cache when changing scenes
      clearCache();
    }
    
    prevSceneIdRef.current = sceneId;
  }, [sceneId, clearCache]);
  
  /**
   * Update scene description using MCP with improved error handling and retry logic
   */
  const updateSceneDescription = useCallback(async (sceneId: string, imageAnalysis: boolean = true): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingDescription(true);
    let attempts = 0;
    const maxAttempts = 2; // Try at most twice
    
    while (attempts < maxAttempts) {
      try {
        const result = await executeTool("update_scene_description", {
          sceneId,
          imageAnalysis
        });
        
        return result.success;
      } catch (error) {
        console.error(`Error updating scene description (attempt ${attempts + 1}/${maxAttempts}):`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          toast.error("Failed to update scene description after multiple attempts");
          return false;
        }
        
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.info("Retrying scene description update...");
      }
    }
    
    return false;
  }, [executeTool]).finally(() => {
    setIsGeneratingDescription(false);
  });
  
  /**
   * Generate and update image prompt using MCP
   */
  const updateImagePrompt = useCallback(async (sceneId: string, useDescription: boolean = true): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingImagePrompt(true);
    try {
      const result = await executeTool("update_image_prompt", {
        sceneId,
        useDescription
      });
      
      return result.success;
    } catch (error) {
      console.error("Error updating image prompt:", error);
      toast.error("Failed to update image prompt");
      return false;
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  }, [executeTool]);
  
  /**
   * Generate scene image using MCP with improved error handling
   */
  const generateImage = useCallback(async (sceneId: string, productShotVersion: string = "v2"): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingImage(true);
    try {
      const result = await executeTool("generate_scene_image", {
        sceneId,
        productShotVersion
      });
      
      return result.success;
    } catch (error) {
      console.error("Error generating scene image:", error);
      toast.error("Failed to generate scene image");
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [executeTool]);
  
  /**
   * Generate scene video using MCP
   */
  const generateVideo = useCallback(async (sceneId: string, aspectRatio: string = "16:9"): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingVideo(true);
    try {
      const result = await executeTool("create_scene_video", {
        sceneId,
        aspectRatio
      });
      
      return result.success;
    } catch (error) {
      console.error("Error generating scene video:", error);
      toast.error("Failed to generate scene video");
      return false;
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [executeTool]);
  
  /**
   * Generate scene script using MCP
   */
  const generateScript = useCallback(async (sceneId: string, contextPrompt: string = ""): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingScript(true);
    try {
      const result = await executeTool("generate_scene_script", {
        sceneId,
        contextPrompt
      });
      
      return result.success;
    } catch (error) {
      console.error("Error generating scene script:", error);
      toast.error("Failed to generate scene script");
      return false;
    } finally {
      setIsGeneratingScript(false);
    }
  }, [executeTool]);
  
  return {
    // Status
    isConnected: hasConnection,
    isProcessing: isExecuting || isAutoReconnecting,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript,
    isAutoReconnecting,
    connectionError: hasConnectionError && !isConnecting,
    
    // Actions
    updateSceneDescription,
    updateImagePrompt,
    generateImage,
    generateVideo,
    generateScript,
    
    // Direct tool execution
    executeTool,
    
    // Cache management
    clearToolCache: clearCache
  };
}
