
import { useState, useCallback, useEffect, useRef } from "react";
import { useAgentSdk, AgentSdkType } from "./use-agent-sdk";
import { Message, MessageStatus } from "@/types/message";
import { useChatSession } from "@/contexts/ChatSessionContext";

interface UseAgentSdkChatOptions {
  projectId?: string;
  sessionId?: string;
  onMessageComplete?: (message: Message) => void;
}

export function useAgentSdkChat(options: UseAgentSdkChatOptions = {}) {
  const { messages, setMessages } = useChatSession();
  const [selectedAgent, setSelectedAgent] = useState<AgentSdkType>("assistant");
  const processingRef = useRef(false);
  
  const { callAgent, isProcessing } = useAgentSdk({
    projectId: options.projectId,
    sessionId: options.sessionId
  });
  
  // Update the ref when isProcessing changes to prevent dependency array issues
  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);
  
  // Sends a message to the agent and updates the chat session
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || processingRef.current) return false;
    
    try {
      // Add user message to the chat
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      
      // Show thinking indicator
      const assistantThinkingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "thinking" as MessageStatus,
        agentType: selectedAgent
      };
      
      const messagesWithThinking = [...newMessages, assistantThinkingMessage];
      setMessages(messagesWithThinking);
      
      // Call the agent SDK
      const result = await callAgent(input, selectedAgent);
      
      if (!result.success) {
        // Update the thinking message to show the error
        const updatedMessages = messagesWithThinking.map(msg => {
          if (msg.id === assistantThinkingMessage.id) {
            return {
              ...msg,
              content: result.error || "I'm sorry, I encountered an error while processing your request.",
              status: "error" as MessageStatus,
              agentType: selectedAgent
            };
          }
          return msg;
        });
        
        setMessages(updatedMessages);
        return false;
      }
      
      // Replace the thinking message with the actual response
      const updatedMessages = messagesWithThinking.map(msg => {
        if (msg.id === assistantThinkingMessage.id) {
          const completedMessage: Message = {
            ...msg,
            content: result.response || "I processed your request but don't have a specific response.",
            status: undefined,
            agentType: result.agentType || selectedAgent,
          };
          
          // Call the onMessageComplete callback if provided
          if (options.onMessageComplete) {
            options.onMessageComplete(completedMessage);
          }
          
          return completedMessage;
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }, [
    messages, 
    setMessages, 
    selectedAgent, 
    callAgent, 
    options.onMessageComplete
  ]);
  
  return {
    messages,
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage
  };
}
