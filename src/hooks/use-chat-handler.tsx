
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserCredits } from "@/hooks/use-user-credits";
import { Message, Task } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { createGlobalMessage } from "@/adapters/MessageTypeAdapter";

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

  // Create a new task for the assistant message
  const createTask = (name: string): Task => ({
    id: uuidv4(),
    name,
    status: "pending",
  });

  // Update a task's status in the latest assistant message
  const updateTaskStatus = (taskId: string, status: Task["status"], details?: string) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      const lastAssistantMessageIndex = newMessages.findIndex(
        m => m.role === "assistant" && m.tasks
      );
      
      if (lastAssistantMessageIndex >= 0) {
        const message = newMessages[lastAssistantMessageIndex];
        const updatedTasks = message.tasks?.map(task => 
          task.id === taskId ? { ...task, status, details } : task
        );
        
        newMessages[lastAssistantMessageIndex] = {
          ...message,
          tasks: updatedTasks,
          status: updatedTasks?.every(t => t.status === "completed") 
            ? "completed" 
            : updatedTasks?.some(t => t.status === "error") 
              ? "error" 
              : "working"
        };
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
      return newMessages;
    });
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

    const userMessage = createGlobalMessage({ 
      role: "user", 
      content: input 
    });
    
    // Create assistant message with initial tasks
    const assistantMessage = createGlobalMessage({ 
      role: "assistant", 
      content: "I'm analyzing your request...", 
      status: "thinking",
      tasks: [
        createTask("Analyzing your request"),
        createTask("Checking for commands"),
        createTask("Preparing response")
      ]
    });
    
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

      console.log('Sending chat request with messages:', messages.length + 1);

      // Update first task to in-progress
      updateTaskStatus(assistantMessage.tasks![0].id, "in-progress");
      
      // Detect any commands in the user message
      const commands = parseCommands(input);
      
      // Short delay to simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark first task as completed
      updateTaskStatus(assistantMessage.tasks![0].id, "completed");
      
      // Update second task based on command detection
      if (commands) {
        updateTaskStatus(
          assistantMessage.tasks![1].id, 
          "completed", 
          `Detected: ${commands.map(c => `${c.action} ${c.feature}`).join(', ')}`
        );
      } else {
        updateTaskStatus(assistantMessage.tasks![1].id, "completed", "No specific commands detected");
      }
      
      // Update the third task to in-progress
      updateTaskStatus(assistantMessage.tasks![2].id, "in-progress");

      // Send only the last few messages to reduce payload size
      const recentMessages = [...messages, userMessage].slice(-10);

      const response = await supabase.functions.invoke('chat-with-langflow', {
        body: { messages: recentMessages }
      });

      if (response.error) {
        console.error('Chat function error:', response.error);
        updateTaskStatus(assistantMessage.tasks![2].id, "error", "Failed to connect to AI service");
        throw new Error(response.error.message || 'Failed to connect to AI service');
      }

      const data = response.data;
      console.log('Received response data:', data);

      if (data && data.message) {
        // Mark third task as completed
        updateTaskStatus(assistantMessage.tasks![2].id, "completed");
        
        // Update assistant message with the response
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: data.message,
            status: "completed"
          };
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
          return newMessages;
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Update assistant message with error
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastIndex = newMessages.length - 1;
        
        // Update all pending tasks to error
        const updatedTasks = newMessages[lastIndex].tasks?.map(task => 
          task.status === "pending" || task.status === "in-progress" 
            ? { ...task, status: "error" as const } 
            : task
        );
        
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: "Sorry, I encountered an error. Please try again.",
          status: "error",
          tasks: updatedTasks
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
        return newMessages;
      });

      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      });
    }
  };

  return { messages, handleSubmit };
}
