
import { useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@/types/multi-agent";
import { SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";
import { CanvasAgentService, CanvasAgentType } from "@/services/canvas/CanvasAgentService";
import { useChatSession } from "@/contexts/ChatSessionContext";

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
  const [mcpConnectionError, setMcpConnectionError] = useState<string | null>(null);
  
  // Use ref to maintain service instance across renders
  const agentServiceRef = useRef<CanvasAgentService | null>(null);

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

  // Initialize agent service
  useEffect(() => {
    // Create or replace agent service whenever project or scene changes
    agentServiceRef.current = new CanvasAgentService(projectId, sceneId);

    // Connect to MCP if enabled
    if (useMcp) {
      setMcpConnectionError(null);
      
      agentServiceRef.current.connectMcp()
        .then(success => {
          if (!success) {
            setMcpConnectionError("Failed to connect to MCP server");
            toast.error("Failed to connect to MCP server - falling back to legacy mode");
          }
        })
        .catch(error => {
          console.error("Failed to connect to MCP server:", error);
          setMcpConnectionError(error instanceof Error ? error.message : 'Unknown error');
          toast.error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    }

    return () => {
      // Clean up agent service on unmount or when props change
      if (agentServiceRef.current) {
        agentServiceRef.current.cleanup()
          .catch(error => console.error("Error cleaning up agent service:", error));
        agentServiceRef.current = null;
      }
    };
  }, [projectId, sceneId, useMcp]);

  // Process agent request (common function for all agent types)
  const processAgentRequest = useCallback(async (
    type: CanvasAgentType,
    prompt: string,
    updateType: SceneUpdateType
  ): Promise<AgentResult> => {
    if (isProcessing || !agentServiceRef.current) {
      toast.error(isProcessing ? "Already processing a request" : "Agent service not initialized");
      return { success: false, error: isProcessing ? "Already processing a request" : "Agent service not initialized" };
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
      // Process the request using the agent service
      const result = await agentServiceRef.current.processAgentRequest(type, prompt, updateType);
      
      // Add assistant message to the conversation
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success 
          ? result.generatedContent || "Successfully processed request" 
          : result.error || "Failed to process request",
        createdAt: new Date().toISOString(),
        agentType: type,
        status: result.success ? undefined : "error"
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (result.success) {
        if (result.generatedContent) {
          await updateScene(sceneId, updateType, result.generatedContent);
          toast.success(`Scene ${updateType} updated successfully`);
        }
      } else {
        toast.error(`Failed to process ${type} agent request: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error in processAgentRequest:`, error);
      
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
      
      toast.error(`Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsProcessing(false);
      setActiveAgent(null);
    }
  }, [isProcessing, sceneId, updateScene]);

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
    if (!useMcp || !agentServiceRef.current) return;
    
    setMcpConnectionError(null);
    
    try {
      await agentServiceRef.current.cleanup();
      const success = await agentServiceRef.current.connectMcp();
      
      if (success) {
        toast.success("Successfully reconnected to MCP server");
      } else {
        setMcpConnectionError("Failed to connect to MCP server");
        toast.error("Failed to connect to MCP server");
      }
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
