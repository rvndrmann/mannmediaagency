import { useState, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { SceneUpdateType } from "@/types/canvas";
import { useMcpToolExecutor } from "./use-mcp-tool-executor";

interface UseCanvasAgentMcpProps {
  projectId: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export const useCanvasAgentMcp = ({
  projectId,
  sceneId,
  updateScene
}: UseCanvasAgentMcpProps) => {
  const { useMcp, setUseMcp, connectionStatus } = useMCPContext();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const mcpToolExecutor = useMcpToolExecutor({ projectId, sceneId });

  const isMcpEnabled = useMcp;
  const isMcpConnected = connectionStatus === 'connected';
  const isProcessing = mcpToolExecutor.isExecuting;

  const toggleMcp = useCallback(() => {
    setUseMcp(!useMcp);
  }, [useMcp, setUseMcp]);

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
    
    const result = await mcpToolExecutor.executeTool(
      'generate_scene_description',
      {
        tool_id: 'generate_scene_description',
        parameters: {
          sceneId,
          useDescription: true // Converting boolean to string for compatibility
        }
      }
    );

    if (result.success && result.result) {
      if (updateScene) {
        await updateScene(sceneId, 'description', result.result);
      }
      toast.success("Scene description generated successfully");
      return true;
    } else {
      toast.error(result.error || "Failed to generate scene description");
      return false;
    }
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

      const result = await mcpToolExecutor.executeTool(
        'generate_image_prompt',
        {
          tool_id: 'generate_image_prompt',
          parameters: {
            sceneId,
            productShotVersion: "2.0"
          }
        }
      );

      if (result.success && result.result) {
        if (updateScene) {
          await updateScene(sceneId, 'imagePrompt', result.result);
        }
        toast.success("Image prompt generated successfully");
        return true;
      } else {
        toast.error(result.error || "Failed to generate image prompt");
        return false;
      }
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

      const result = await mcpToolExecutor.executeTool(
        'generate_scene_image',
        {
          tool_id: 'generate_scene_image',
          parameters: {
            sceneId,
            aspectRatio: "16:9"
          }
        }
      );

      if (result.success && result.result) {
        if (updateScene) {
          await updateScene(sceneId, 'imageUrl', result.result);
        }
        toast.success("Scene image generated successfully");
        return true;
      } else {
        toast.error(result.error || "Failed to generate scene image");
        return false;
      }
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

      const result = await mcpToolExecutor.executeTool(
        'generate_scene_video',
        {
          tool_id: 'generate_scene_video',
          parameters: {
            sceneId,
            contextPrompt: description || "A beautiful scene"
          }
        }
      );

      if (result.success && result.result) {
        if (updateScene) {
          await updateScene(sceneId, 'videoUrl', result.result);
        }
        toast.success("Scene video generated successfully");
        return true;
      } else {
        toast.error(result.error || "Failed to generate scene video");
        return false;
      }
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

      const result = await mcpToolExecutor.executeTool(
        'generate_scene_script',
        {
          tool_id: 'generate_scene_script',
          parameters: {
            sceneId,
            contextPrompt: context || "A general context"
          }
        }
      );

      if (result.success && result.result) {
        if (updateScene) {
          await updateScene(sceneId, 'script', result.result);
        }
        toast.success("Scene script generated successfully");
        return true;
      } else {
        toast.error(result.error || "Failed to generate scene script");
        return false;
      }
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
    generateSceneScript
  };
};
