
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Message, Task, Command } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { useDefaultImages } from "@/hooks/use-default-images"; 

const STORAGE_KEY = "ai_agent_chat_history";
const CHAT_CREDIT_COST = 0.07;

export const useAIChat = (onToolSwitch?: (tool: string, params?: any) => void) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { defaultImages, updateLastUsed, saveDefaultImage } = useDefaultImages();

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

  const executeCommand = async (command: Command, messageIndex: number): Promise<void> => {
    try {
      console.log('Executing command:', command);
      
      if (onToolSwitch && (
        command.feature === "product-shot-v1" || 
        command.feature === "product-shot-v2" || 
        command.feature === "image-to-video" ||
        command.feature === "product-video")
      ) {
        // Handle default image for product shots
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

        // Switch to the appropriate tool with parameters
        onToolSwitch(command.feature, command.parameters);
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
      
      toast({
        title: "Error",
        description: `Failed to execute command: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
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

    try {
      await deductChatCredits();
      
      await logChatUsage(trimmedInput);
      
      refetchCredits();

      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");
      
      // Get the active tool from the application state
      const activeTool = localStorage.getItem("activeTool") || "ai-agent";

      // First try command detection
      console.log('Sending request to command detection system');
      let detectionResponse;
      try {
        detectionResponse = await supabase.functions.invoke('detect-command', {
          body: { 
            message: trimmedInput,
            activeContext: activeTool,
            userCredits
          }
        });
      } catch (detectionError) {
        console.error('Command detection error:', detectionError);
        // We'll continue with Langflow if detection fails
        detectionResponse = { data: { use_langflow: true } };
      }

      let command = null;
      let messageContent = null;
      let useLangflow = true;

      // Check if we got a command detection result
      if (detectionResponse.data) {
        useLangflow = detectionResponse.data.use_langflow !== false;
        command = detectionResponse.data.command;
        messageContent = detectionResponse.data.message;
      }

      // If command detection worked, use that result directly
      if (command && messageContent) {
        console.log("Using detected command:", command);
        
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
        
        // Execute the command
        await executeCommand(command, messageIndex);
      }
      // Otherwise fallback to Langflow
      else if (useLangflow) {
        console.log('Falling back to Langflow for response generation');
        
        try {
          // Send message to Langflow with any detected but incomplete command data
          const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
            body: { 
              messages: [...messages, userMessage],
              activeTool,
              userCredits,
              command,
              detectedMessage: messageContent
            }
          });

          console.log('Received response from LangFlow:', data);

          if (error) {
            console.error('Chat error:', error);
            updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "error", "Failed to connect to AI service");
            throw error;
          }

          updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed");
          updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "in-progress");

          if (data && data.message) {
            // Check if there's a command to execute
            const responseCommand = data.command;
            
            if (responseCommand) {
              console.log('Command received from Langflow:', responseCommand);
              
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
              
              // Execute the command
              await executeCommand(responseCommand, messageIndex);
            }
            
            // Update the message content with the LangFlow response
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
          } else {
            throw new Error('Invalid response format from AI');
          }
        } catch (langflowError) {
          console.error('Langflow processing error:', langflowError);
          
          updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "error");
          updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "error");
          
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
        }
      } else {
        // This is the case where neither command detection nor Langflow worked
        throw new Error('Both command detection and Langflow processing failed');
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      assistantMessage.tasks!.forEach(task => {
        if (task.status === "pending" || task.status === "in-progress") {
          updateTaskStatus(messageIndex, task.id, "error");
        }
      });
      
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
