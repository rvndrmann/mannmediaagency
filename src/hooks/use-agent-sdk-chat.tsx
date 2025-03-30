
import { useState, useCallback, useEffect } from "react";
import { useAgentSdk, AgentSdkType } from "./use-agent-sdk";
import { Message } from "@/types/message";
import { useChatSession } from "@/contexts/ChatSessionContext";

interface UseAgentSdkChatOptions {
  projectId?: string;
  sessionId?: string;
  onMessageComplete?: (message: Message) => void;
}

export function useAgentSdkChat(options: UseAgentSdkChatOptions = {}) {
  const { messages, setMessages } = useChatSession();
  const [selectedAgent, setSelectedAgent] = useState<AgentSdkType>("assistant");
  
  const { callAgent, isProcessing } = useAgentSdk({
    projectId: options.projectId,
    sessionId: options.sessionId
  });
  
  // Sends a message to the agent and updates the chat session
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing) return false;
    
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
        status: "thinking",
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
              status: "error",
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
          const completedMessage = {
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
    isProcessing, 
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
