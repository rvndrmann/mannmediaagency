
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Message, Task } from "@/types/message";
import { toast } from "sonner";

// Common chat handler functionality
export const useChatHandler = (
  endpoint: string, 
  messageStorageKey: string,
  creditsPerMessage: number = 0.07
) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem(messageStorageKey);
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (e) {
      console.error(`Error loading ${messageStorageKey} chat history:`, e);
      return [];
    }
  });
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user credits
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", user.id)
          .single();
          
        if (error) throw error;
        setUserCredits(data);
      } catch (error) {
        console.error("Error fetching user credits:", error);
      }
    };
    
    fetchUserCredits();
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(messageStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.error(`Error saving ${messageStorageKey} chat history:`, e);
    }
  }, [messages, messageStorageKey]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    if (!userCredits || userCredits.credits_remaining < creditsPerMessage) {
      toast.error(`You need at least ${creditsPerMessage} credits to send a message.`);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Add user message to chat
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, userMessage]);
      
      // Add thinking indicator
      const thinkingMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "Thinking...",
        status: "thinking",
        createdAt: new Date().toISOString(),
        tasks: [
          {
            id: uuidv4(),
            name: "Processing your request",
            description: "Analyzing your message",
            status: "pending" 
          },
          {
            id: uuidv4(),
            name: "Generating response",
            description: "Creating a helpful answer",
            status: "pending"
          }
        ]
      };
      
      setMessages((prev) => [...prev, thinkingMessage]);
      
      // Get the user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to use this feature");
      
      // Make API call to edge function
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          message: input
        }
      });
      
      if (error) throw error;
      
      // Update user credits
      await supabase
        .from("user_credits")
        .update({ credits_remaining: userCredits.credits_remaining - creditsPerMessage })
        .eq("user_id", user.id);
        
      setUserCredits(prev => prev ? {
        credits_remaining: prev.credits_remaining - creditsPerMessage
      } : null);
      
      // Update the thinking message with the actual response
      setMessages((prev) => 
        prev.map((msg, i) => 
          i === prev.length - 1 ? {
            ...msg,
            content: data.response,
            status: "completed",
            tasks: [
              { ...msg.tasks![0], status: "completed" },
              { ...msg.tasks![1], status: "completed" }
            ]
          } : msg
        )
      );
      
      // Clear input
      setInput("");
      
    } catch (error) {
      console.error(`Error in ${endpoint} handleSubmit:`, error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      
      toast.error(errorMessage);
      
      // Update the thinking message with the error
      setMessages((prev) => 
        prev.map((msg, i) => 
          i === prev.length - 1 ? {
            ...msg,
            content: `Error: ${errorMessage}`,
            status: "error",
            tasks: [
              { ...msg.tasks![0], status: "completed" },
              { ...msg.tasks![1], status: "error", details: errorMessage }
            ]
          } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(messageStorageKey);
  }, [messageStorageKey]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    userCredits,
    handleSubmit,
    clearChat
  };
};
