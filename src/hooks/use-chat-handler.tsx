
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserCredits, UserCredits } from "@/hooks/use-user-credits";
import { UseQueryResult } from "@tanstack/react-query";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_agent_chat_history";
const CHAT_CREDIT_COST = 0.07;

export function useChatHandler(setInput: (value: string) => void) {
  const { toast } = useToast();
  const userCreditData = useUserCredits();
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const deductCredits = async () => {
    try {
      const { data, error } = await supabase.rpc('safely_decrease_chat_credits', {
        credit_amount: CHAT_CREDIT_COST
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Credit deduction error:', error);
      const message = error instanceof Error ? error.message : 'Failed to deduct credits';
      toast({
        title: "Insufficient Credits",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const logChatUsage = async (messageContent: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('chat_usage')
        .insert({
          message_content: messageContent,
          credits_charged: CHAT_CREDIT_COST,
          words_count: messageContent.trim().split(/\s+/).length,
          user_id: userData.user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log chat usage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, input: string) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Check credits before proceeding
    if (!userCreditData.data || userCreditData.data.credits_remaining < CHAT_CREDIT_COST) {
      toast({
        title: "Insufficient Credits",
        description: `You need at least ${CHAT_CREDIT_COST} credits to send a message.`,
        variant: "destructive",
      });
      return;
    }

    // Try to deduct credits first
    const deductionSuccessful = await deductCredits();
    if (!deductionSuccessful) return;

    const userMessage: Message = { role: "user", content: input };
    const assistantMessage: Message = { role: "assistant", content: "Loading..." };
    
    // Update messages state with new messages
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, userMessage, assistantMessage];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
      return newMessages;
    });

    setInput("");

    try {
      // Log the chat usage after successful credit deduction
      await logChatUsage(input);
      
      // Refetch credits to update UI
      await userCreditData.refetch();

      console.log('Sending chat request:', {
        messages: [...messages, userMessage],
        lastMessage: userMessage.content
      });

      const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
        body: { messages: [...messages, userMessage] }
      });

      console.log('Received response:', data);

      if (error) {
        console.error('Chat error:', error);
        throw error;
      }

      if (data && data.message) {
        // Update assistant message with the response
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1].content = data.message;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
          return newMessages;
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error("Error:", error);
      // Update assistant message with error
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        newMessages[newMessages.length - 1].content = "Sorry, I encountered an error. Please try again.";
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
        return newMessages;
      });
    }
  };

  return { messages, handleSubmit };
}
