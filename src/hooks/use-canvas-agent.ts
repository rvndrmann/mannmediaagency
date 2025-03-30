
import { useState, useCallback } from "react";
import { useCanvasAgentMcp } from "./use-canvas-agent-mcp";
import { useCanvasMessages } from "./use-canvas-messages";
import { toast } from "sonner";
import { Message } from "@/types/message";

interface UpdateSceneFunction {
  (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string): Promise<void>;
}

interface UseCanvasAgentProps {
  projectId?: string;
  sceneId?: string;
  updateScene?: UpdateSceneFunction;
}

/**
 * Main hook for Canvas Agent functionality
 */
export function useCanvasAgent(props: UseCanvasAgentProps) {
  const { projectId, sceneId, updateScene } = props;
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the Canvas Messages hook for message management
  const { 
    messages, 
    addAgentMessage, 
    addUserMessage, 
    addSystemMessage, 
    clearMessages 
  } = useCanvasMessages();
  
  // Use the MCP integration hook
  const agentMcp = useCanvasAgentMcp({
    projectId,
    sceneId,
    updateScene
  });
  
  // Enhance the MCP methods with message handling
  const generateSceneDescription = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate description");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      if (context) {
        addUserMessage(`Generate scene description with context: ${context}`);
      } else {
        addUserMessage("Generate scene description");
      }
      
      const success = await agentMcp.generateSceneDescription(sceneId, context);
      
      if (success) {
        addAgentMessage(
          "description", 
          "Scene description generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene description");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene description:", error);
      addSystemMessage("Error generating scene description");
      toast.error("Failed to generate scene description");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateImagePrompt = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate image prompt");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      if (context) {
        addUserMessage(`Generate image prompt with context: ${context}`);
      } else {
        addUserMessage("Generate image prompt");
      }
      
      const success = await agentMcp.generateImagePrompt(sceneId, context);
      
      if (success) {
        addAgentMessage(
          "image", 
          "Image prompt generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate image prompt");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating image prompt:", error);
      addSystemMessage("Error generating image prompt");
      toast.error("Failed to generate image prompt");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateSceneImage = useCallback(async (sceneId: string, imagePrompt?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate image");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      if (imagePrompt) {
        addUserMessage(`Generate scene image with prompt: ${imagePrompt}`);
      } else {
        addUserMessage("Generate scene image");
      }
      
      const success = await agentMcp.generateSceneImage(sceneId, imagePrompt);
      
      if (success) {
        addAgentMessage(
          "image", 
          "Scene image generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene image");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene image:", error);
      addSystemMessage("Error generating scene image");
      toast.error("Failed to generate scene image");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateSceneVideo = useCallback(async (sceneId: string, description?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate video");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      if (description) {
        addUserMessage(`Generate scene video with description: ${description}`);
      } else {
        addUserMessage("Generate scene video");
      }
      
      const success = await agentMcp.generateSceneVideo(sceneId, description);
      
      if (success) {
        addAgentMessage(
          "video", 
          "Scene video generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene video");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene video:", error);
      addSystemMessage("Error generating scene video");
      toast.error("Failed to generate scene video");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateFullScript = useCallback(async (context: string): Promise<boolean> => {
    if (!projectId) {
      toast.error("Project ID is required to generate full script");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      addUserMessage(`Generate full script with context: ${context}`);
      
      // In a real implementation, this would call a script generation service
      setTimeout(() => {
        addAgentMessage(
          "script", 
          "Full script generation would be implemented here. This is a placeholder for the actual implementation.",
          sceneId
        );
      }, 1500);
      
      return true;
    } catch (error) {
      console.error("Error generating full script:", error);
      addSystemMessage("Error generating full script");
      toast.error("Failed to generate full script");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sceneId, addAgentMessage, addUserMessage, addSystemMessage]);
  
  return {
    ...agentMcp,
    isLoading,
    messages,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateFullScript,
    addUserMessage,
    addSystemMessage,
    clearMessages
  };
}
