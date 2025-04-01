import { useState, useCallback } from "react";
import { Message, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

/**
 * Hook for managing Canvas Agent messages
 */
export function useCanvasMessages() {
  const [messages, setMessages] = useState<Message[]>([]);

  /**
   * Add a new message from an agent
   */
  const addAgentMessage = useCallback((
    agentType: string, 
    content: string, 
    sceneId?: string,
    canvasContent?: {
      title?: string;
      script?: string;
      description?: string;
      imagePrompt?: string;
      voiceOverText?: string;
    }
  ) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      type: "canvas" as MessageType,
      agentType,
      status: "completed",
      canvasContent: sceneId ? {
        sceneId,
        ...canvasContent
      } : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  /**
   * Add a new message from the user
   */
  const addUserMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      type: "text" as MessageType
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  /**
   * Add a system message
   */
  const addSystemMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: "system",
      content,
      createdAt: new Date().toISOString(),
      type: "system" as MessageType
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addAgentMessage,
    addUserMessage,
    addSystemMessage,
    clearMessages
  };
}
