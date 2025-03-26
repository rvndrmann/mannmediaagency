import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Message, Task } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

const STORAGE_KEY = "ai_agent_chat_history";
const CHAT_CREDIT_COST = 0.07;
const MAX_CHAT_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (e) {
      console.error("Error loading chat history from localStorage:", e);
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [useAssistantsApi, setUseAssistantsApi] = useState<boolean>(false);
  const [useMcp, setUseMcp] = useState<boolean>(false);

  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching user credits:", error);
        return { credits_remaining: 0 };
      }
    },
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [messages]);

  // Function to create a proper Message object
  const createMessage = (data: Partial<Message>): Message => {
    return {
      id: data.id || crypto.randomUUID(),
      role: data.role || "assistant",
      content: data.content || "",
      createdAt: data.createdAt || new Date().toISOString(),
      status: data.status,
      tasks: data.tasks,
      attachments: data.attachments,
      tool_name: data.tool_name,
      tool_arguments: data.tool_arguments,
      agentType: data.agentType,
      command: data.command,
      handoffRequest: data.handoffRequest,
      timestamp: data.timestamp,
      type: data.type,
      selectedTool: data.selectedTool
    };
  };

  const createTask = (name: string): Task => ({
    id: uuidv4(),
    name,
    status: "pending",
  });

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

  const setAllTasksToError = (messageIndex: number, errorMessage?: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (messageIndex >= 0 && messageIndex < newMessages.length) {
        const message = newMessages[messageIndex];
        if (message.tasks) {
          const updatedTasks = message.tasks.map(task => ({
            ...task,
            status: task.status === "completed" ? "completed" as const : "error" as const,
            details: task.status === "completed" ? task.details : (errorMessage || "Failed")
          }));
          
          newMessages[messageIndex] = {
            ...message,
            tasks: updatedTasks,
            status: "error"
          };
        }
      }
      return newMessages;
    });
  };

  const deductChatCredits = async () => {
    try {
      const { data, error } = await supabase.rpc('safely_decrease_chat_credits', {
        credit_amount: CHAT_CREDIT_COST
      });

      if (error || !data) {
        throw new Error("Failed to deduct credits for chat usage");
      }

      return data;
    } catch (error) {
      console.error("Error deducting chat credits:", error);
      throw error;
    }
  };

  const logChatUsage = async (messageContent: string, selectedTool?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('chat_usage')
        .insert({
          user_id: user.id,
          message_content: messageContent,
          credits_charged: CHAT_CREDIT_COST,
          words_count: messageContent.trim().split(/\s+/).length,
          selected_tool: selectedTool || null
        });

      if (error) {
        console.error('Failed to log chat usage:', error);
      }
    } catch (error) {
      console.error('Error in logChatUsage:', error);
    }
  };

  const makeRequestWithRetry = async (endpoint: string, body: any, retries = MAX_CHAT_RETRY_ATTEMPTS): Promise<any> => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt-1)));
      }
      
      try {
        const response = await supabase.functions.invoke(endpoint, {
          body: {
            ...body,
            useAssistantsApi: useAssistantsApi,
            useMcp: useMcp
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message || "Function invocation failed");
        }
        
        return response.data;
      } catch (error) {
        console.error(`Request attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        if (attempt === retries) {
          throw error;
        }
      }
    }
    
    throw lastError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (!userCredits || userCredits.credits_remaining < CHAT_CREDIT_COST) {
      toast.error(`You need at least ${CHAT_CREDIT_COST} credits to send a message.`);
      return;
    }

    const requestId = `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setProcessingRequestId(requestId);

    const userMessage = createMessage({ role: "user", content: trimmedInput });

    const assistantMessage = createMessage({ 
      role: "assistant", 
      content: "I'm analyzing your request...", 
      status: "thinking",
      tasks: [
        createTask("Processing with AI"),
        createTask("Preparing response")
      ]
    });

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    
    const messageIndex = messages.length + 1;
    let creditsDeducted = false;

    try {
      // 1. Deduct credits first
      await deductChatCredits();
      creditsDeducted = true;
      
      // 2. Log usage
      await logChatUsage(trimmedInput);
      
      // 3. Refresh user credits
      refetchCredits();

      // 4. Start processing with AI
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      
      // 5. Make call to AI function
      const data = await makeRequestWithRetry('chat-with-langflow', { 
        message: trimmedInput,
        requestId
      });

      console.log(`[${requestId}] Received response:`, data);

      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");

      if (data && data.message) {
        updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed");
        
        // Check if there's a command in the response
        let commandObj = data.command ? data.command : null;
        let selectedTool = null;
        
        // Extract selected tool information from command if present
        if (commandObj && commandObj.feature) {
          selectedTool = commandObj.feature;
        } else if (commandObj && commandObj.tool) {
          selectedTool = commandObj.tool;
        } else if (commandObj && commandObj.type) {
          selectedTool = commandObj.type;
        }
        
        // 2. Log usage with selected tool information
        await logChatUsage(trimmedInput, selectedTool);
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: data.message,
              command: commandObj,
              selectedTool: selectedTool,
              status: "completed"
            };
          }
          return newMessages;
        });
        
        // If a media command is detected, display a toast
        if (commandObj && (
            (commandObj.type === 'image' || commandObj.type === 'video') ||
            (commandObj.feature && ['product-shot-v1', 'product-shot-v2', 'image-to-video'].includes(commandObj.feature))
        )) {
          toast.info("AI has suggested creating media. Check the response for details.");
        }
      } else if (data && data.error === "Request timeout") {
        updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "error", "Request timed out");
        updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "error");
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: "I'm sorry, the request took too long to process. Please try a shorter message or try again later.",
              status: "error"
            };
          }
          return newMessages;
        });
        
        toast.error("Request timed out. Please try again with a shorter message.");
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error(`[${requestId}] Chat error:`, error);
      
      if (messageIndex >= 0 && messageIndex < messages.length + 2) {
        setAllTasksToError(messageIndex, "An error occurred");
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: "Sorry, I encountered an error. Please try again.",
              status: "error"
            };
          }
          return newMessages;
        });
      }
      
      toast.error(error instanceof Error ? error.message : "Failed to get response from AI");
    } finally {
      setIsLoading(false);
      setProcessingRequestId(null);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits,
    processingRequestId,
    useAssistantsApi,
    setUseAssistantsApi,
    useMcp,
    setUseMcp
  };
};
