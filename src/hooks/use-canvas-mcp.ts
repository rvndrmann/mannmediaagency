
import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { SceneUpdateType } from "@/types/canvas";

interface UseCanvasMcpProps {
  projectId: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export const useCanvasMcp = ({
  projectId,
  sceneId,
  updateScene
}: UseCanvasMcpProps) => {
  const { useMcp, setUseMcp, connectionStatus, mcpServers } = useMCPContext();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const isMcpEnabled = useMcp;
  const isMcpConnected = connectionStatus === 'connected';
  const isProcessing = isGeneratingDescription || isGeneratingImagePrompt || 
    isGeneratingImage || isGeneratingVideo || isGeneratingScript;

  const toggleMcp = useCallback(() => {
    setUseMcp(!useMcp);
  }, [useMcp, setUseMcp]);

  const executeMcpTool = async (toolName: string, params: any = {}): Promise<any> => {
    if (!mcpServers.length || !mcpServers[0].isConnected()) {
      toast.error("MCP not connected. Please connect first.");
      return { success: false, error: "MCP not connected" };
    }
    
    try {
      return await mcpServers[0].executeTool(toolName, {
        ...params,
        projectId: params.projectId || projectId,
        sceneId: params.sceneId || sceneId
      });
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      toast.error(`Failed to execute ${toolName.replace(/_/g, ' ')}`);
      return { success: false, error: String(error) };
    }
  };

  const generateSceneDescription = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp) {
      toast.error("MCP is not enabled");
      return false;
    }

    if (!sceneId) {
      toast.error("Scene ID is required");
      return false;
    }

    try {
      setIsGeneratingDescription(true);
      
      // Simulate MCP tool execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const description = "This scene takes place in a modern office with large windows. " +
        "The lighting is warm and inviting, creating a comfortable atmosphere. " +
        "The camera moves slowly from left to right, revealing the space gradually.";
      
      if (updateScene) {
        await updateScene(sceneId, 'description', description);
      }
      
      toast.success("Scene description generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating scene description:", error);
      toast.error("Failed to generate scene description");
      return false;
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateImagePrompt = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp) {
      toast.error("MCP is not enabled");
      return false;
    }

    if (!sceneId) {
      toast.error("Scene ID is required");
      return false;
    }

    try {
      setIsGeneratingImagePrompt(true);

      // Simulate MCP tool execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const imagePrompt = "A modern office space with large windows, warm lighting, " +
        "minimal furniture, soft shadows, high detail, photorealistic, 8k resolution";
      
      if (updateScene) {
        await updateScene(sceneId, 'imagePrompt', imagePrompt);
      }
      
      toast.success("Image prompt generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating image prompt:", error);
      toast.error("Failed to generate image prompt");
      return false;
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  };

  const generateSceneImage = async (sceneId: string, imagePrompt?: string): Promise<boolean> => {
    if (!useMcp) {
      toast.error("MCP is not enabled");
      return false;
    }

    if (!sceneId) {
      toast.error("Scene ID is required");
      return false;
    }

    try {
      setIsGeneratingImage(true);

      // Simulate MCP tool execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const imageUrl = "https://placehold.co/1024x576/667788/ffffff?text=Generated+Scene+Image";
      
      if (updateScene) {
        await updateScene(sceneId, 'image', imageUrl);
      }
      
      toast.success("Scene image generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating scene image:", error);
      toast.error("Failed to generate scene image");
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateSceneVideo = async (sceneId: string, description?: string): Promise<boolean> => {
    if (!useMcp) {
      toast.error("MCP is not enabled");
      return false;
    }

    if (!sceneId) {
      toast.error("Scene ID is required");
      return false;
    }

    try {
      setIsGeneratingVideo(true);

      // Simulate MCP tool execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const videoUrl = "https://placehold.co/1024x576/445566/ffffff?text=Generated+Scene+Video";
      
      if (updateScene) {
        await updateScene(sceneId, 'video', videoUrl);
      }
      
      toast.success("Scene video generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating scene video:", error);
      toast.error("Failed to generate scene video");
      return false;
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const generateSceneScript = async (sceneId: string, context?: string): Promise<boolean> => {
    if (!useMcp) {
      toast.error("MCP is not enabled");
      return false;
    }

    if (!sceneId) {
      toast.error("Scene ID is required");
      return false;
    }

    try {
      setIsGeneratingScript(true);

      // Simulate MCP tool execution
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      const script = "INT. MODERN OFFICE - DAY\n\n" +
        "The camera pans across an elegant office space, capturing the natural light streaming through large windows.\n\n" +
        "JOHN (V.O.)\nEvery decision shapes our future.\n\n" +
        "We see employees working diligently at their desks.";
      
      if (updateScene) {
        await updateScene(sceneId, 'script', script);
      }
      
      toast.success("Scene script generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating scene script:", error);
      toast.error("Failed to generate scene script");
      return false;
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return {
    activeAgent,
    isProcessing,
    isMcpEnabled,
    isMcpConnected,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript,
    toggleMcp,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateSceneScript,
    executeMcpTool
  };
};

export const useCanvasAgentMcp = useCanvasMcp;
