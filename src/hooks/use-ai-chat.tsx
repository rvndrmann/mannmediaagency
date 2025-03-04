import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Message, Task, Command } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { useDefaultImages } from "@/hooks/use-default-images"; 
import { toast } from "sonner";

const STORAGE_KEY = "ai_agent_chat_history";
const CHAT_CREDIT_COST = 0.07;
const MAX_CHAT_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

export const useAIChat = (onToolSwitch?: (tool: string, params?: any) => void) => {
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
  const { defaultImages, updateLastUsed, saveDefaultImage } = useDefaultImages();

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

  const createTask = (name: string): Task => ({
    id: uuidv4(),
    name,
    status: "pending",
  });

  const updateTaskStatus = useCallback((messageIndex: number, taskId: string, status: Task["status"], details?: string) => {
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
  }, []);

  const setAllTasksToError = useCallback((messageIndex: number, errorMessage?: string) => {
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
  }, []);

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

  const logChatUsage = async (messageContent: string) => {
    try {
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
    } catch (error) {
      console.error('Error in logChatUsage:', error);
    }
  };

  const executeCommand = async (command: Command, messageIndex: number): Promise<void> => {
    try {
      console.log('Executing command:', command);
      
      if (onToolSwitch && (
        command.feature === "product-shot-v1" || 
        command.feature === "product-shot-v2" || 
        command.feature === "image-to-video" ||
        command.feature === "product-video")
      ) {
        if (command.feature === "product-shot-v1" && 
            command.parameters?.name && 
            !command.parameters.imageUrl && 
            defaultImages?.length) {
          
          const matchedImage = defaultImages.find(img => 
            img.name.toLowerCase() === command.parameters?.name?.toLowerCase()
          );
          
          if (matchedImage) {
            command.parameters.imageId = matchedImage.id;
            command.parameters.imageUrl = matchedImage.url;
            await updateLastUsed.mutateAsync(matchedImage.id);
          }
        }

        onToolSwitch(command.feature, command.parameters);
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              status: "completed"
            };
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Command execution error:", error);
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            status: "error"
          };
        }
        return newMessages;
      });
      
      toast.error(`Failed to execute command: ${error instanceof Error ? error.message : "Unknown error"}`);
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
          body: body
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

  const formatMessageHistory = (messages: Message[]): any[] => {
    if (!messages || messages.length === 0) {
      return [];
    }
    
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
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

    const userMessage: Message = { 
      role: "user", 
      content: trimmedInput
    };

    const assistantMessage: Message = { 
      role: "assistant", 
      content: "I'm analyzing your request...", 
      status: "thinking",
      tasks: [
        createTask("Analyzing your request"),
        createTask("Processing with AI"),
        createTask("Preparing response")
      ]
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    
    const messageIndex = messages.length + 1;
    let creditsDeducted = false;

    try {
      await deductChatCredits();
      creditsDeducted = true;
      
      await logChatUsage(trimmedInput);
      
      refetchCredits();

      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      await new Promise(resolve => setTimeout(resolve, 500));
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");
      
      const activeTool = localStorage.getItem("activeTool") || "ai-agent";
      
      console.log(`[${requestId}] Sending request to command detection system`);
      let detectionResponse;
      try {
        detectionResponse = await makeRequestWithRetry('detect-command', { 
          message: trimmedInput,
          activeContext: activeTool,
          userCredits
        });
        
        console.log(`[${requestId}] Command detection response:`, detectionResponse);
      } catch (detectionError) {
        console.error(`[${requestId}] Command detection error:`, detectionError);
        detectionResponse = { use_langflow: true };
      }

      let command = null;
      let messageContent = null;
      let useLangflow = true;

      if (detectionResponse) {
        useLangflow = detectionResponse.use_langflow !== false;
        command = detectionResponse.command;
        messageContent = detectionResponse.message;
        
        if (detectionResponse.error === "INSUFFICIENT_CREDITS") {
          updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "error", "Insufficient credits");
          updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "error");
          
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                content: messageContent || "You don't have enough credits for this operation.",
                status: "error"
              };
            }
            return newMessages;
          });
          
          setIsLoading(false);
          setProcessingRequestId(null);
          return;
        }
      }

      if (command && messageContent) {
        console.log(`[${requestId}] Using detected command:`, command);
        
        updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed");
        updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "completed");
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              command: command,
              content: messageContent,
              status: "completed"
            };
          }
          return newMessages;
        });
        
        await executeCommand(command, messageIndex);
      }
      else if (useLangflow) {
        console.log(`[${requestId}] Falling back to Langflow for response generation`);
        
        try {
          const data = await makeRequestWithRetry('chat-with-langflow', { 
            message: trimmedInput,
            activeTool,
            userCredits,
            requestId
          });

          console.log(`[${requestId}] Received response from LangFlow:`, data);

          updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed");
          updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "in-progress");

          if (data && data.message) {
            const responseCommand = data.command;
            
            if (responseCommand) {
              console.log(`[${requestId}] Command received from Langflow:`, responseCommand);
              
              setMessages(prev => {
                const newMessages = [...prev];
                if (messageIndex >= 0 && messageIndex < newMessages.length) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    command: responseCommand,
                    content: data.message,
                    status: "working"
                  };
                }
                return newMessages;
              });
              
              await executeCommand(responseCommand, messageIndex);
            } else {
              updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "completed");
              
              setMessages(prev => {
                const newMessages = [...prev];
                if (messageIndex >= 0 && messageIndex < newMessages.length) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: data.message,
                    status: "completed"
                  };
                }
                return newMessages;
              });
            }
          } else if (data && data.error === "Request timeout") {
            updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "error", "Request timed out");
            updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "error");
            
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
        } catch (langflowError) {
          console.error(`[${requestId}] Langflow processing error:`, langflowError);
          
          setAllTasksToError(messageIndex, "Connection to AI service failed");
          
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                content: "I'm having trouble connecting to my AI services. Please try again in a moment.",
                status: "error"
              };
            }
            return newMessages;
          });
          
          toast.error("Failed to process your request. Please try again later.");
        }
      } else {
        setAllTasksToError(messageIndex, "AI processing error");
        throw new Error('Both command detection and Langflow processing failed');
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
    processingRequestId
  };
};
