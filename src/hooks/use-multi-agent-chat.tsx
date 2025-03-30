
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, MessageStatus } from "@/types/message";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgentType = "main" | "script" | "image" | "scene" | "tool" | "data" | string;

export function useMultiAgentChat(projectId?: string) {
  const { messages, setMessages } = useChatSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("main");
  const processingRef = useRef(false);
  
  // Update the ref when state changes
  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);
  
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || processingRef.current) return false;
    
    try {
      setIsProcessing(true);
      
      // Add user message to the chat
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };
      
      // Create a new array instead of mutating the original
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
      
      // Create a new array instead of mutating the original
      const messagesWithThinking = [...newMessages, assistantThinkingMessage];
      setMessages(messagesWithThinking);
      
      // Call the agent SDK function
      const { data, error } = await supabase.functions.invoke('agent-sdk', {
        body: {
          input: input,
          projectId: projectId,
          agentType: selectedAgent,
          userId: (await supabase.auth.getUser()).data?.user?.id || crypto.randomUUID(),
        }
      });
      
      if (error) {
        console.error("Error calling agent-sdk:", error);
        toast.error("Failed to get response from agent");
        
        // Update the thinking message to show the error - create a new array
        const updatedMessages = messagesWithThinking.map(msg => {
          if (msg.id === assistantThinkingMessage.id) {
            return {
              ...msg,
              content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
              status: "error" as MessageStatus,
              agentType: selectedAgent
            };
          }
          return msg;
        });
        
        setMessages(updatedMessages);
      } else if (data) {
        // Replace the thinking message with the actual response - create a new array
        const updatedMessages = messagesWithThinking.map(msg => {
          if (msg.id === assistantThinkingMessage.id) {
            return {
              ...msg,
              content: data.response || "I processed your request but don't have a specific response.",
              status: undefined,
              agentType: data.agentType || selectedAgent,
            };
          }
          return msg;
        });
        
        setMessages(updatedMessages);
      }
      
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [messages, setMessages, selectedAgent, projectId]);
  
  return {
    messages,
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage
  };
}
