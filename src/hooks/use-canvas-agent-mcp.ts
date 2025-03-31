
import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { SceneUpdateType } from "@/types/canvas";
import { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

interface UseCanvasAgentMCPProps {
  projectId?: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export const useCanvasAgentMcp = ({
  projectId,
  sceneId,
  updateScene
}: UseCanvasAgentMCPProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  
  const { useMcp, mcpServers, isConnecting } = useMCPContext();
  
  const addUserMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);
  
  const addAssistantMessage = useCallback((content: string, metadataInfo?: any) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      // Only add metadata if it exists and convert it to the right format
      ...(metadataInfo ? { metadata: metadataInfo } : {})
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);
  
  const generateSceneDescription = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp || !mcpServers.length) {
      toast.error("MCP is not enabled or connected");
      return false;
    }

    try {
      setIsProcessing(true);
      setActiveAgent("scene-description-generator");
      
      addUserMessage(`Generate a description for scene ${sceneId}`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const description = "This scene takes place in a modern office setting with large windows " +
        "overlooking a city skyline. The lighting is bright and natural, creating a positive atmosphere. " +
        "The camera starts with a wide shot showing the entire space before slowly tracking in towards " +
        "the main subject who is working at their desk.";
      
      if (updateScene) {
        await updateScene(sceneId, 'description', description);
      }
      
      addAssistantMessage("I've generated a detailed scene description that includes lighting, camera movement, and setting details.");
      
      return true;
    } catch (error) {
      console.error("Error generating scene description:", error);
      addAssistantMessage("I couldn't generate the scene description. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };
  
  const generateImagePrompt = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp || !mcpServers.length) {
      toast.error("MCP is not enabled or connected");
      return false;
    }

    try {
      setIsProcessing(true);
      setActiveAgent("image-prompt-generator");
      
      addUserMessage(`Generate an image prompt for scene ${sceneId}`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const imagePrompt = "Modern office interior, bright natural lighting, wide angle, " +
        "large windows with city skyline view, minimalist design, soft shadows, 8k, detailed, " +
        "photorealistic, cinematic composition, shallow depth of field";
      
      if (updateScene) {
        await updateScene(sceneId, 'imagePrompt', imagePrompt);
      }
      
      addAssistantMessage("I've created an optimized image prompt with style details and quality parameters.");
      
      return true;
    } catch (error) {
      console.error("Error generating image prompt:", error);
      addAssistantMessage("I couldn't generate the image prompt. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };
  
  const generateSceneImage = async (sceneId: string, imagePrompt?: string): Promise<boolean> => {
    if (!useMcp || !mcpServers.length) {
      toast.error("MCP is not enabled or connected");
      return false;
    }

    try {
      setIsProcessing(true);
      setActiveAgent("scene-image-generator");
      
      addUserMessage(`Generate an image for scene ${sceneId}`);
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const imageUrl = "https://placehold.co/1024x576/667788/ffffff?text=Generated+Scene+Image";
      
      if (updateScene) {
        await updateScene(sceneId, 'imageUrl', imageUrl);
      }
      
      addAssistantMessage("I've generated an image for your scene based on the prompt.", {
        imageUrl
      });
      
      return true;
    } catch (error) {
      console.error("Error generating scene image:", error);
      addAssistantMessage("I couldn't generate the scene image. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };
  
  const generateSceneVideo = async (sceneId: string, description?: string): Promise<boolean> => {
    if (!useMcp || !mcpServers.length) {
      toast.error("MCP is not enabled or connected");
      return false;
    }

    try {
      setIsProcessing(true);
      setActiveAgent("scene-video-generator");
      
      addUserMessage(`Generate a video for scene ${sceneId}`);
      
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      const videoUrl = "https://placehold.co/1024x576/445566/ffffff?text=Generated+Scene+Video";
      
      if (updateScene) {
        await updateScene(sceneId, 'videoUrl', videoUrl);
      }
      
      addAssistantMessage("I've generated a video for your scene based on the description and image.", {
        videoUrl
      });
      
      return true;
    } catch (error) {
      console.error("Error generating scene video:", error);
      addAssistantMessage("I couldn't generate the scene video. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };
  
  const generateSceneScript = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp || !mcpServers.length) {
      toast.error("MCP is not enabled or connected");
      return false;
    }

    try {
      setIsProcessing(true);
      setActiveAgent("scene-script-generator");
      
      addUserMessage(`Generate a script for scene ${sceneId}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const script = "INT. MODERN OFFICE - DAY\n\n" +
        "CAMERA starts wide, revealing a sleek, minimalist office space. Large windows showcase a stunning city skyline.\n\n" +
        "TRACK IN slowly toward ALEX (30s), focused intensely on their computer screen.\n\n" +
        "ALEX\n(to self)\nJust one more line of code...\n\n" +
        "Alex types rapidly, then sits back with satisfaction.\n\n" +
        "ALEX\nThere. Perfect.";
      
      if (updateScene) {
        await updateScene(sceneId, 'script', script);
      }
      
      addAssistantMessage("I've written a script for your scene with camera directions, dialogue, and action descriptions.");
      
      return true;
    } catch (error) {
      console.error("Error generating scene script:", error);
      addAssistantMessage("I couldn't generate the scene script. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };
  
  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    isProcessing,
    activeAgent,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateSceneScript
  };
};

// Export as both the original name and the one needed by other files
export { useCanvasAgentMcp as useCanvasAgent };
