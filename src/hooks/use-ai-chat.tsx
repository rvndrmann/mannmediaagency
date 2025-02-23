
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_agent_chat_history";

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: userCredits } = useQuery({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!userCredits || userCredits.credits_remaining < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to continue chatting.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log('Sending chat request with messages:', [...messages, userMessage]);
      
      const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
        body: { 
          messages: [...messages, userMessage]
        },
        headers: {
          'Content-Type': 'application/json'
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
