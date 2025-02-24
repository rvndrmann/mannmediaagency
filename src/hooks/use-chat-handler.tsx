
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_agent_chat_history";

export function useChatHandler(setInput: (value: string) => void) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const handleSubmit = async (e: React.FormEvent, input: string) => {
    e.preventDefault();
    if (input.trim() === "") return;

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
