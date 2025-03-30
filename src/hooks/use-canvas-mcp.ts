
import { useState, useCallback, useEffect } from "react";
import { useMcpToolExecutor } from "./use-mcp-tool-executor";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";

interface UseCanvasMcpOptions {
  projectId?: string;
  sceneId?: string;
  autoConnect?: boolean;
}

/**
 * Hook for using MCP tools in the Canvas context
 */
export function useCanvasMcp(options: UseCanvasMcpOptions = {}) {
  const { projectId, sceneId, autoConnect = true } = options;
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  const { mcpServers, useMcp, reconnectToMcp } = useMCPContext();
  const { executeTool, isExecuting, hasConnection } = useMcpToolExecutor({
    projectId,
    sceneId
  });
  
  // Auto-connect to MCP if enabled
  useEffect(() => {
    if (autoConnect && projectId && useMcp && mcpServers.length === 0) {
      reconnectToMcp();
    }
  }, [autoConnect, projectId, useMcp, mcpServers.length, reconnectToMcp]);
  
  /**
   * Update scene description using MCP
   */
  const updateSceneDescription = useCallback(async (sceneId: string, imageAnalysis: boolean = true): Promise<boolean> => {
    if (!sceneId) return false;
    
    setIsGeneratingDescription(true);
    try {
      const result = await executeTool("update_scene_description", {
        sceneId,
        imageAnalysis
      });
      
      return result.success;
    } catch (error) {
      console.error("Error updating scene description:", error);
      toast.error("Failed to update scene description");
      return false;
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [executeTool]);
  
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
   * Generate scene image using MCP
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
    isProcessing: isExecuting,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript,
    
    // Actions
    updateSceneDescription,
    updateImagePrompt,
    generateImage,
    generateVideo,
    generateScript,
    
    // Direct tool execution
    executeTool
  };
}
