
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChatHandler(messages: Message[], setInput: (value: string) => void) {
  const handleSubmit = async (e: React.FormEvent, input: string) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const userMessage: Message = { role: "user", content: input };
    messages.push(userMessage);

    setInput("");

    const assistantMessage: Message = { role: "assistant", content: "Loading..." };
    messages.push(assistantMessage);

    try {
      console.log('Sending chat request:', {
        messages: [...messages],
        lastMessage: userMessage.content
      });

      const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
        body: { messages: messages }
      });

      console.log('Received response:', data);

      if (error) {
        console.error('Chat error:', error);
        throw error;
      }

      if (data && data.message) {
        assistantMessage.content = data.message;
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error("Error:", error);
      assistantMessage.content = "Sorry, I encountered an error. Please try again.";
    }
  };

  return { handleSubmit };
}
