
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Message, Task } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

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

  // Create a new task
  const createTask = (name: string): Task => ({
    id: uuidv4(),
    name,
    status: "pending",
  });

  // Update a task's status
  const updateTaskStatus = (messageIndex: number, taskId: string, status: Task["status"], details?: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (messageIndex >= 0 && messageIndex < newMessages.length) {
        const message = newMessages[messageIndex];
        if (message.tasks) {
          const updatedTasks = message.tasks.map(task => 
            task.id === taskId ? { ...task, status, details } : task
          );
          
          newMessages[messageIndex] = {
            ...message,
            tasks: updatedTasks,
            status: updatedTasks.every(t => t.status === "completed") 
              ? "completed" 
              : updatedTasks.some(t => t.status === "error") 
                ? "error" 
                : "working"
          };
        }
      }
      return newMessages;
    });
  };

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

  // Parse user message for commands
  const parseCommands = (message: string) => {
    // This is a simplified parser
    const commandPatterns = [
      { regex: /create (?:a |an )?(product shot|image)/i, feature: "product-shot-v1", action: "create" },
      { regex: /generate (?:a |an )?(product (shot|image))/i, feature: "product-shot-v2", action: "create" },
      { regex: /convert (?:an )?(image|shot) to video/i, feature: "image-to-video", action: "convert" },
      { regex: /create (?:a |an )?(video|product video)/i, feature: "product-video", action: "create" },
      { regex: /save (?:this )?(image|shot) as default/i, feature: "default-image", action: "save" },
      { regex: /use default (image|shot)/i, feature: "default-image", action: "use" },
    ];

    const detectedCommands = commandPatterns.filter(pattern => pattern.regex.test(message))
      .map(command => ({
        feature: command.feature,
        action: command.action,
        parameters: {} // In a full implementation, we would parse parameters here
      }));

    return detectedCommands.length ? detectedCommands : null;
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

    // Create assistant message with initial tasks
    const assistantMessage: Message = { 
      role: "assistant", 
      content: "I'm analyzing your request...", 
      status: "thinking",
      tasks: [
        createTask("Analyzing your request"),
        createTask("Checking for commands"),
        createTask("Preparing response")
      ]
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    
    const messageIndex = messages.length + 1; // Index of the new assistant message

    try {
      // Deduct credits first
      await deductChatCredits();
      
      // Log the chat usage
      await logChatUsage(trimmedInput);
      
      // Refetch credits to update UI
      refetchCredits();

      // Update first task to in-progress
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      
      // Detect any commands in the user message
      const commands = parseCommands(trimmedInput);
      
      // Short delay to simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark first task as completed
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      
      // Update second task based on command detection
      if (commands) {
        updateTaskStatus(
          messageIndex,
          assistantMessage.tasks![1].id, 
          "completed", 
          `Detected: ${commands.map(c => `${c.action} ${c.feature}`).join(', ')}`
        );
      } else {
        updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed", "No specific commands detected");
      }
      
      // Update the third task to in-progress
      updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "in-progress");

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
        updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "error", "Failed to connect to AI service");
        throw error;
      }

      if (data && data.message) {
        // Mark third task as completed
        updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "completed");
        
        // Update assistant message with the response
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: data.message,
            status: "completed"
          };
          return newMessages;
        });
      } else {
        throw new Error('Invalid response format from AI');
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Update all pending tasks to error
      assistantMessage.tasks!.forEach(task => {
        if (task.status === "pending" || task.status === "in-progress") {
          updateTaskStatus(messageIndex, task.id, "error");
        }
      });
      
      // Update assistant message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          content: "Sorry, I encountered an error. Please try again.",
          status: "error"
        };
        return newMessages;
      });
      
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
