
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/message";
import { CanvasProject, SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";
import { MCPServerService } from "@/services/mcpService";
import { useChatSession } from "@/contexts/ChatSessionContext";

type CanvasAgentType = "scene" | "image" | "video" | null;

interface UseCanvasAgentProps {
  projectId: string;
  sceneId: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

interface AgentResult {
  success: boolean;
  generatedContent?: string;
  error?: string;
}

export function useCanvasAgent({ projectId, sceneId, updateScene }: UseCanvasAgentProps) {
  const { 
    getOrCreateChatSession, 
    updateChatSession, 
    activeSession
  } = useChatSession();
  
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<CanvasAgentType>(null);
  const [useMcp, setUseMcp] = useState(true); // Default to true - MCP enabled by default
  const [mcpServer, setMcpServer] = useState<MCPServerService | null>(null);
  const [mcpConnectionError, setMcpConnectionError] = useState<string | null>(null);
  const mcpServerRef = useRef<MCPServerService | null>(null);

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

  // Initialize MCP server if useMcp is true (which is now the default)
  useEffect(() => {
    if (useMcp && !mcpServerRef.current) {
      const server = new MCPServerService();
      mcpServerRef.current = server;
      
      setMcpConnectionError(null);
      
      server.connect()
        .then(() => {
          console.log("Successfully connected to MCP server");
          setMcpServer(server);
          setMcpConnectionError(null);
        })
        .catch(error => {
          console.error("Failed to connect to MCP server:", error);
          setMcpConnectionError(error instanceof Error ? error.message : 'Unknown error');
          toast.error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    }

    return () => {
      // Clean up MCP server on unmount
      if (mcpServerRef.current) {
        mcpServerRef.current.cleanup()
          .catch(error => console.error("Error cleaning up MCP server:", error));
        mcpServerRef.current = null;
      }
    };
  }, [useMcp, projectId]);

  // Process agent request (common function for all agent types)
  const processAgentRequest = useCallback(async (
    type: CanvasAgentType,
    prompt: string,
    updateType: SceneUpdateType
  ): Promise<AgentResult> => {
    if (isProcessing) {
      toast.error("Already processing a request");
      return { success: false, error: "Already processing a request" };
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
    
    let generatedContent = "";

    try {
      if (useMcp && mcpServerRef.current) {
        // Try to establish connection if not already connected
        if (!mcpServerRef.current.isConnected?.()) {
          try {
            await mcpServerRef.current.connect();
          } catch (connError) {
            console.error("Failed to connect to MCP server, falling back to legacy method:", connError);
            // Continue to legacy method
          }
        }
        
        // Only proceed with MCP if connection successful
        if (mcpServerRef.current.isConnected?.()) {
          // Use MCP to process the request
          const toolName = updateType === 'description' 
            ? 'update_scene_description' 
            : updateType === 'imagePrompt' 
              ? 'update_image_prompt' 
              : updateType === 'image' 
                ? 'generate_scene_image' 
                : 'create_scene_video';
                
          const result = await mcpServerRef.current.callTool(toolName, {
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
            // Capture the generated content from the result
            if (updateType === 'description' && result.description) {
              generatedContent = result.description;
              await updateScene(sceneId, updateType, generatedContent);
            } else if (updateType === 'imagePrompt' && result.imagePrompt) {
              generatedContent = result.imagePrompt;
              await updateScene(sceneId, updateType, generatedContent);
            }
            
            return { 
              success: true, 
              generatedContent
            };
          } else {
            throw new Error(result.error || "Failed to process request with MCP");
          }
        }
      }
      
      // Legacy implementation (without MCP)
      console.log("Using legacy implementation for " + type);
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
        generatedContent = data.content || data.imagePrompt || '';
        await updateScene(sceneId, updateType, generatedContent);
        toast.success(`Scene ${updateType} updated successfully`);
        
        return { 
          success: true, 
          generatedContent
        };
      } else {
        throw new Error(data?.error || "Failed to process request");
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
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  }, [isProcessing, useMcp, sceneId, updateScene, projectId]);

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

  // Handle MCP connection error retry
  const retryMcpConnection = useCallback(async () => {
    if (!useMcp) return;
    
    setMcpConnectionError(null);
    
    try {
      if (mcpServerRef.current) {
        await mcpServerRef.current.cleanup();
      }
      
      const server = new MCPServerService();
      mcpServerRef.current = server;
      
      await server.connect();
      setMcpServer(server);
      toast.success("Successfully reconnected to MCP server");
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      setMcpConnectionError(error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [useMcp]);

  return {
    messages,
    setMessages,
    isProcessing,
    activeAgent,
    useMcp,
    setUseMcp,
    mcpConnectionError,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    processAgentRequest,
    chatSessionId,
    retryMcpConnection
  };
}
