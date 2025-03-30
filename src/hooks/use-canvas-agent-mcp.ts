
import { useState, useCallback } from "react";
import { useCanvasMcp } from "./use-canvas-mcp";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";

interface UseCanvasAgentMcpProps {
  projectId?: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string) => Promise<void>;
}

/**
 * Hook for integrating Canvas with Multi-Agent and MCP
 */
export function useCanvasAgentMcp(props: UseCanvasAgentMcpProps) {
  const { projectId, sceneId, updateScene } = props;
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentMessages, setAgentMessages] = useState<{ agent: string, message: string }[]>([]);
  
  const { useMcp, setUseMcp } = useMCPContext();
  
  const {
    isConnected,
    isProcessing,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    updateSceneDescription,
    updateImagePrompt,
    generateImage,
    generateVideo
  } = useCanvasMcp({
    projectId,
    sceneId
  });
  
  /**
   * Generate scene description using the proper agent
   */
  const generateSceneDescription = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate description");
      return false;
    }
    
    setActiveAgent('description');
    
    try {
      // Use MCP if enabled
      if (useMcp && isConnected) {
        const success = await updateSceneDescription(sceneId, true);
        
        // Update the scene in the UI if successful and updateScene handler is provided
        if (success && updateScene) {
          // Note: In a real implementation, we'd fetch the updated scene description
          // For now, we're assuming the MCP call updated the database directly
          addAgentMessage('description', 'Scene description generated using MCP');
          return true;
        }
        
        return success;
      } else {
        // Fallback to multi-agent implementation
        // In a real implementation, this would call a different API or service
        toast.info("MCP is disabled. Using multi-agent fallback for scene description.");
        addAgentMessage('description', 'Scene description generated using multi-agent (fallback)');
        
        // For demo purposes, simulate a successful update
        if (updateScene) {
          const generatedDescription = "This is a fallback description generated without MCP";
          await updateScene(sceneId, 'description', generatedDescription);
        }
        
        return true;
      }
    } catch (error) {
      console.error("Error generating scene description:", error);
      toast.error("Failed to generate scene description");
      return false;
    } finally {
      setActiveAgent(null);
    }
  }, [useMcp, isConnected, updateSceneDescription, updateScene]);
  
  /**
   * Generate image prompt using the proper agent
   */
  const generateImagePrompt = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate image prompt");
      return false;
    }
    
    setActiveAgent('imagePrompt');
    
    try {
      // Use MCP if enabled
      if (useMcp && isConnected) {
        const success = await updateImagePrompt(sceneId, true);
        
        // Update the scene in the UI if successful and updateScene handler is provided
        if (success && updateScene) {
          // Note: In a real implementation, we'd fetch the updated image prompt
          addAgentMessage('imagePrompt', 'Image prompt generated using MCP');
          return true;
        }
        
        return success;
      } else {
        // Fallback to multi-agent implementation
        toast.info("MCP is disabled. Using multi-agent fallback for image prompt.");
        addAgentMessage('imagePrompt', 'Image prompt generated using multi-agent (fallback)');
        
        // For demo purposes, simulate a successful update
        if (updateScene) {
          const generatedPrompt = "A high-quality product shot with perfect lighting, studio background, professional presentation";
          await updateScene(sceneId, 'imagePrompt', generatedPrompt);
        }
        
        return true;
      }
    } catch (error) {
      console.error("Error generating image prompt:", error);
      toast.error("Failed to generate image prompt");
      return false;
    } finally {
      setActiveAgent(null);
    }
  }, [useMcp, isConnected, updateImagePrompt, updateScene]);
  
  /**
   * Generate scene image using the proper agent
   */
  const generateSceneImage = useCallback(async (sceneId: string, imagePrompt?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate image");
      return false;
    }
    
    setActiveAgent('image');
    
    try {
      // Use MCP if enabled
      if (useMcp && isConnected) {
        const success = await generateImage(sceneId, "v2");
        
        if (success) {
          addAgentMessage('image', 'Scene image generated using MCP');
          return true;
        }
        
        return success;
      } else {
        // Fallback to multi-agent implementation
        toast.info("MCP is disabled. Using multi-agent fallback for image generation.");
        addAgentMessage('image', 'Scene image generated using multi-agent (fallback)');
        
        // For demo purposes, simulate a successful update
        if (updateScene) {
          // In a real implementation, this would generate an actual image
          await updateScene(sceneId, 'image', 'https://placeholder.com/800x600');
        }
        
        return true;
      }
    } catch (error) {
      console.error("Error generating scene image:", error);
      toast.error("Failed to generate scene image");
      return false;
    } finally {
      setActiveAgent(null);
    }
  }, [useMcp, isConnected, generateImage, updateScene]);
  
  /**
   * Generate scene video using the proper agent
   */
  const generateSceneVideo = useCallback(async (sceneId: string, description?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate video");
      return false;
    }
    
    setActiveAgent('video');
    
    try {
      // Use MCP if enabled
      if (useMcp && isConnected) {
        const success = await generateVideo(sceneId, "16:9");
        
        if (success) {
          addAgentMessage('video', 'Scene video generated using MCP');
          return true;
        }
        
        return success;
      } else {
        // Fallback to multi-agent implementation
        toast.info("MCP is disabled. Using multi-agent fallback for video generation.");
        addAgentMessage('video', 'Scene video generated using multi-agent (fallback)');
        
        // For demo purposes, simulate a successful update
        if (updateScene) {
          // In a real implementation, this would generate an actual video
          await updateScene(sceneId, 'video', 'https://placeholder.com/video');
        }
        
        return true;
      }
    } catch (error) {
      console.error("Error generating scene video:", error);
      toast.error("Failed to generate scene video");
      return false;
    } finally {
      setActiveAgent(null);
    }
  }, [useMcp, isConnected, generateVideo, updateScene]);
  
  /**
   * Add an agent message to the history
   */
  const addAgentMessage = useCallback((agent: string, message: string) => {
    setAgentMessages(prev => [...prev, { agent, message }]);
  }, []);
  
  /**
   * Toggle MCP on/off
   */
  const toggleMcp = useCallback(() => {
    setUseMcp(!useMcp);
    toast.info(useMcp ? "MCP disabled. Using fallback methods." : "MCP enabled. Using MCP services when available.");
  }, [useMcp, setUseMcp]);
  
  return {
    // Status
    activeAgent,
    isProcessing,
    agentMessages,
    isMcpEnabled: useMcp,
    isMcpConnected: isConnected,
    
    // Generation status
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    
    // MCP actions
    toggleMcp,
    
    // Generation actions
    generateSceneScript: async () => false, // Placeholder - would be implemented by multi-agent system
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    
    // Messages
    addAgentMessage,
    clearAgentMessages: () => setAgentMessages([])
  };
}
