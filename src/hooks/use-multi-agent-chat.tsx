
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, MessageStatus } from "@/types/message";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgentType = "main" | "script" | "image" | "scene" | "tool" | "data" | string;

export interface MultiAgentChatOptions {
  projectId?: string;
  onError?: (error: Error) => void;
}

export function useMultiAgentChat(options: MultiAgentChatOptions = {}) {
  const { projectId, onError } = options;
  const { messages, setMessages } = useChatSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("main");
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const messageHistoryRef = useRef<Array<{role: string, content: string}>>([]);
  
  // Update the ref when state changes to avoid dependency array issues
  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);
  
  // Update message history ref when messages change
  useEffect(() => {
    // Convert chat messages to the format expected by the AI
    messageHistoryRef.current = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));
  }, [messages]);
  
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || processingRef.current) return false;
    
    setError(null);
    
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
      
      // Get current user ID for logging
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || crypto.randomUUID();
      
      console.log("Calling agent-sdk with:", {
        input,
        agentType: selectedAgent,
        projectId,
        userId,
        messageHistoryLength: messageHistoryRef.current.length
      });
      
      // Call the agent SDK function
      const { data, error } = await supabase.functions.invoke('agent-sdk', {
        body: {
          input: input,
          projectId: projectId,
          agentType: selectedAgent,
          userId: userId,
          sessionId: crypto.randomUUID(), // Used for tracing
          messageHistory: messageHistoryRef.current
        }
      });
      
      if (error) {
        console.error("Error calling agent-sdk:", error);
        setError(error.message || "Failed to get response from agent");
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
        return false;
      } 
      
      if (data) {
        console.log("Agent SDK response:", data);
        
        // Check if we need to handle a handoff to a different agent
        if (data.handoff) {
          console.log("Handling handoff to:", data.handoff.targetAgent);
          
          // Replace the thinking message with the handoff message
          const updatedMessages = messagesWithThinking.map(msg => {
            if (msg.id === assistantThinkingMessage.id) {
              return {
                ...msg,
                content: data.response || "I'm transferring you to a specialized agent.",
                status: undefined,
                agentType: selectedAgent,
                handoffRequest: {
                  targetAgent: data.handoff.targetAgent,
                  reason: data.handoff.reason,
                  additionalContext: data.handoff.additionalContext
                }
              };
            }
            return msg;
          });
          
          setMessages(updatedMessages);
          
          // Update the selected agent
          setSelectedAgent(data.handoff.targetAgent);
          
          // Update message history with the new messages
          if (data.messageHistory) {
            messageHistoryRef.current = data.messageHistory;
          }
          
          return true;
        }
        
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
        
        // Update message history with the new messages
        if (data.messageHistory) {
          messageHistoryRef.current = data.messageHistory;
        }
        
        setMessages(updatedMessages);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      toast.error("Failed to send message");
      
      // Call the onError callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [messages, setMessages, selectedAgent, projectId, onError]);
  
  // Add a utility method to add a message directly (for system messages, etc.)
  const addMessage = useCallback((content: string, role: "system" | "assistant" | "user" = "system") => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: role,
      content: content,
      createdAt: new Date().toISOString(),
      agentType: role === "assistant" ? selectedAgent : undefined
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, [setMessages, selectedAgent]);
  
  return {
    messages,
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage,
    error,
    addMessage
  };
}
