
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/message";
import { SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useMCPContext } from "@/contexts/MCPContext";

type CanvasAgentType = "scene" | "image" | "video" | null;

interface UseCanvasAgentProps {
  projectId: string;
  sceneId: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export function useCanvasAgent({ projectId, sceneId, updateScene }: UseCanvasAgentProps) {
  const { 
    getOrCreateChatSession, 
    updateChatSession, 
    activeSession
  } = useChatSession();
  
  const { mcpServers, useMcp } = useMCPContext();
  
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<CanvasAgentType>(null);

  // Get or create a chat session for this project
  useEffect(() => {
    if (projectId) {
      const sessionId = getOrCreateChatSession(projectId);
      setChatSessionId(sessionId);
      
      // If there's an active session with messages, use those
      if (activeSession && activeSession.projectId === projectId) {
        setMessages(activeSession.messages);
      }
    }
  }, [projectId, getOrCreateChatSession, activeSession]);

  // Update the shared chat session when messages change
  useEffect(() => {
    if (chatSessionId && messages.length > 0) {
      updateChatSession(chatSessionId, messages);
    }
  }, [messages, chatSessionId, updateChatSession]);

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

    // Create a new message for the conversation
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      if (useMcp && mcpServers.length > 0) {
        const mcpServer = mcpServers[0];
        
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
          imageAnalysis: updateType === 'description',
          useDescription: updateType === 'imagePrompt',
          productShotVersion: updateType === 'image' ? "v2" : undefined,
          aspectRatio: updateType === 'video' ? "16:9" : undefined
        });
        
        // Add assistant message to the conversation
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.success ? result.result : result.error || "Failed to process request",
          createdAt: new Date().toISOString(),
          agentType: type
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        if (result.success) {
          toast.success(result.result);
        } else {
          throw new Error(result.error || "Failed to process request with MCP");
        }
      } else {
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
        
        // Add assistant message to the conversation
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data?.content || data?.imagePrompt || 'Successfully processed request',
          createdAt: new Date().toISOString(),
          agentType: type
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        if (data && data.success) {
          const updatedContent = data.content || data.imagePrompt || '';
          await updateScene(sceneId, updateType, updatedContent);
          toast.success(`Scene ${updateType} updated successfully`);
        } else {
          throw new Error(data?.error || "Failed to process request");
        }
      }
    } catch (error) {
      console.error(`Error processing ${type} agent request:`, error);
      
      // Add error message to conversation
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date().toISOString(),
        type: "error",
        status: "error"
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(`Failed to process ${type} agent request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  }, [isProcessing, useMcp, mcpServers, sceneId, updateScene, projectId]);

  // Generate scene script
  const generateSceneScript = useCallback(async (sceneId: string, context: string) => {
    return processAgentRequest('scene', context, 'script');
  }, [processAgentRequest]);

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
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    processAgentRequest,
    chatSessionId
  };
}
