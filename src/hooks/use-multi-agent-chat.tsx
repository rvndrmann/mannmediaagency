
import { useState, useCallback } from "react";
import { Message } from "@/types/message";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useMultiAgentChat(projectId?: string) {
  const { messages, setMessages } = useChatSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("main");
  
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
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
      
      setMessages([...newMessages, assistantThinkingMessage]);
      
      // Call the unified agent edge function
      const { data, error } = await supabase.functions.invoke('unified-agent', {
        body: {
          input: input,
          projectId: projectId,
          agentType: selectedAgent,
          userId: crypto.randomUUID(), // Ideally use actual user ID here from auth
        }
      });
      
      if (error) {
        console.error("Error calling unified-agent:", error);
        toast.error("Failed to get response from agent");
        
        // Update the thinking message to show the error
        const errorMessage: Message = {
          id: assistantThinkingMessage.id,
          role: "assistant",
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          createdAt: new Date().toISOString(),
          status: "error",
          agentType: selectedAgent
        };
        
        setMessages([...newMessages, errorMessage]);
      } else if (data) {
        // Replace the thinking message with the actual response
        const assistantMessage: Message = {
          id: assistantThinkingMessage.id,
          role: "assistant",
          content: data.response || "I processed your request but don't have a specific response.",
          createdAt: new Date().toISOString(),
          agentType: data.agentType || selectedAgent,
        };
        
        setMessages([...newMessages, assistantMessage]);
      }
      
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [messages, setMessages, isProcessing, selectedAgent, projectId]);
  
  return {
    messages,
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage
  };
}
