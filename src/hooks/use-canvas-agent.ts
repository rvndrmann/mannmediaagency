
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/message";
import { CanvasProject, SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";
import { MCPServerService } from "@/services/mcpService";

type CanvasAgentType = "scene" | "image" | "video" | null;

interface UseCanvasAgentProps {
  projectId: string;
  sceneId: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export function useCanvasAgent({ projectId, sceneId, updateScene }: UseCanvasAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<CanvasAgentType>(null);
  const [useMcp, setUseMcp] = useState(false);
  const [mcpServer, setMcpServer] = useState<MCPServerService | null>(null);

  // Initialize MCP server
  useEffect(() => {
    if (useMcp && !mcpServer) {
      const server = new MCPServerService(`https://api.example.com/mcp/${projectId}`);
      server.connect().then(() => {
        setMcpServer(server);
      }).catch(error => {
        console.error("Failed to connect to MCP server:", error);
        toast.error("Failed to connect to MCP server");
      });
    }

    return () => {
      // Clean up MCP server on unmount
      if (mcpServer) {
        mcpServer.cleanup().catch(console.error);
      }
    };
  }, [useMcp, projectId, mcpServer]);

  // Process agent request (common function for all agent types)
  const processAgentRequest = useCallback(async (
    type: CanvasAgentType,
    prompt: string,
    updateType: SceneUpdateType
  ) => {
    if (isProcessing) {
      toast.error("Already processing a request");
      return;
    }

    setIsProcessing(true);
    setActiveAgent(type);

    try {
      if (useMcp && mcpServer) {
        // Use MCP to process the request
        const toolName = updateType === 'description' 
          ? 'update_scene_description' 
          : updateType === 'imagePrompt' 
            ? 'update_image_prompt' 
            : updateType === 'image' 
              ? 'generate_scene_image' 
              : 'create_scene_video';
              
        const result = await mcpServer.callTool(toolName, {
          sceneId,
          imageAnalysis: true,
          useDescription: true,
          productShotVersion: "v2",
          aspectRatio: "16:9"
        });
        
        // Handle the result - this would need to be customized based on the real implementation
        if (result.success) {
          toast.success(result.result);
          
          // Refresh the scene data - in a real implementation, the MCP tool would update the scene directly
          // Here we're simulating that the MCP updated the scene
          return;
        } else {
          throw new Error(result.error || "Failed to process request with MCP");
        }
      }

      // Legacy implementation (without MCP)
      const { data, error } = await supabase.functions.invoke(
        type === 'image' ? 'generate-image-prompts' : 'canvas-scene-agent',
        {
          body: {
            sceneId,
            prompt,
            type: updateType,
            projectId
          }
        }
      );

      if (error) {
        throw error;
      }

      if (data && data.success) {
        const updatedContent = data.content || data.imagePrompt || '';
        await updateScene(sceneId, updateType, updatedContent);
        toast.success(`Scene ${updateType} updated successfully`);
      } else {
        throw new Error(data?.error || "Failed to process request");
      }
    } catch (error) {
      console.error(`Error processing ${type} agent request:`, error);
      toast.error(`Failed to process ${type} agent request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  }, [isProcessing, useMcp, mcpServer, sceneId, updateScene]);

  // Generate scene description
  const generateSceneDescription = useCallback(async (sceneId: string, context: string) => {
    return processAgentRequest('scene', context, 'description');
  }, [processAgentRequest]);

  // Generate image prompt
  const generateImagePrompt = useCallback(async (sceneId: string, context: string) => {
    return processAgentRequest('image', context, 'imagePrompt');
  }, [processAgentRequest]);

  // Generate scene image using product shot
  const generateSceneImage = useCallback(async (sceneId: string, context: string) => {
    return processAgentRequest('image', context, 'image');
  }, [processAgentRequest]);

  // Generate scene video using image-to-video
  const generateSceneVideo = useCallback(async (sceneId: string, context: string) => {
    return processAgentRequest('video', context, 'video');
  }, [processAgentRequest]);

  return {
    messages,
    setMessages,
    isProcessing,
    activeAgent,
    useMcp,
    setUseMcp,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    processAgentRequest
  };
}
