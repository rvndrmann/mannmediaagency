
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_agent_chat_history";
const CHAT_CREDIT_COST = 0.07;

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const deductChatCredits = async () => {
    const { data, error } = await supabase.rpc('safely_decrease_chat_credits', {
      credit_amount: CHAT_CREDIT_COST
    });

    if (error || !data) {
      throw new Error("Failed to deduct credits for chat usage");
    }

    return data;
  };

  const logChatUsage = async (messageContent: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('chat_usage')
      .insert({
        user_id: user.id,
        message_content: messageContent,
        credits_charged: CHAT_CREDIT_COST,
        words_count: messageContent.trim().split(/\s+/).length
      });

    if (error) {
      console.error('Failed to log chat usage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (!userCredits || userCredits.credits_remaining < CHAT_CREDIT_COST) {
      toast({
        title: "Insufficient Credits",
        description: `You need at least ${CHAT_CREDIT_COST} credits to send a message.`,
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: trimmedInput
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Deduct credits first
      await deductChatCredits();
      
      // Log the chat usage
      await logChatUsage(trimmedInput);
      
      // Refetch credits to update UI
      refetchCredits();

      console.log('Sending chat request:', {
        messages: [...messages, userMessage],
        lastMessage: userMessage.content
      });
      
      const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
        body: { 
          messages: [...messages, userMessage]
        }
      });

      console.log('Received response:', data);

      if (error) {
        console.error('Chat error:', error);
        throw error;
      }

      if (data && data.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response format from AI');
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  };
};
