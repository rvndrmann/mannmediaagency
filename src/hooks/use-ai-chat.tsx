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

  const detectCommand = async (messageContent: string): Promise<Command | null> => {
    try {
      console.log('Detecting command with AI...');
      
      const { data, error } = await supabase.functions.invoke('detect-command', {
        body: { 
          messages: messages,
          lastMessage: messageContent 
        }
      });

      console.log('Command detection response:', data);

      if (error) {
        console.error('Command detection error:', error);
        return null;
      }

      return data?.command || null;
    } catch (error) {
      console.error('Error detecting command:', error);
      return null;
    }
  };

  const extractParameters = (message: string, feature: Command['feature']): Record<string, any> => {
    const params: Record<string, any> = {};
    
    if (feature === "default-image") {
      const nameMatch = message.match(/named ["']([^"']+)["']/i) || message.match(/name ["']([^"']+)["']/i);
      if (nameMatch && nameMatch[1]) {
        params.name = nameMatch[1];
      }
      
      if (message.includes("use default")) {
        const nameMatch = message.match(/use default image ["']([^"']+)["']/i) || 
                        message.match(/use default ["']([^"']+)["']/i) ||
                        message.match(/use the ["']([^"']+)["'] default/i);
        if (nameMatch && nameMatch[1]) {
          params.name = nameMatch[1];
          
          const matchedImage = defaultImages?.find(img => 
            img.name.toLowerCase() === nameMatch[1].toLowerCase()
          );
          
          if (matchedImage) {
            params.imageId = matchedImage.id;
            params.imageUrl = matchedImage.url;
          }
        } else if (defaultImages && defaultImages.length > 0) {
          const sortedImages = [...defaultImages].sort((a, b) => {
            if (!a.last_used_at) return 1;
            if (!b.last_used_at) return -1;
            return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
          });
          
          params.imageId = sortedImages[0].id;
          params.imageUrl = sortedImages[0].url;
          params.name = sortedImages[0].name;
        }
      }
    }
    
    return params;
  };

  const executeCommand = async (command: Command, messageIndex: number): Promise<string> => {
    try {
      const commandTaskId = uuidv4();
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          const message = newMessages[messageIndex];
          if (message.tasks) {
            newMessages[messageIndex] = {
              ...message,
              tasks: [...message.tasks, {
                id: commandTaskId,
                name: `Executing ${command.feature} ${command.action} command`,
                status: "in-progress"
              }]
            };
          }
        }
        return newMessages;
      });

      let result = "";
      
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
      }
      
      switch (command.feature) {
        case "default-image":
          if (command.action === "list") {
            result = await handleListDefaultImages(commandTaskId, messageIndex);
          } else if (command.action === "use") {
            result = await handleUseDefaultImage(command.parameters, commandTaskId, messageIndex);
          } else if (command.action === "save") {
            result = await handleSaveDefaultImage(command.parameters, commandTaskId, messageIndex);
          }
          break;
          
        case "product-shot-v1":
        case "product-shot-v2":
          if (command.action === "create") {
            let responseText = `I can help you create a product shot. `;
            
            if (command.parameters?.prompt) {
              responseText += `I'll use the prompt: "${command.parameters.prompt}". `;
            }
            
            if (command.parameters?.imageUrl) {
              responseText += `I'll use the default image "${command.parameters.name}" for your product shot. `;
            } else if (command.parameters?.name && defaultImages?.length) {
              const matchedImage = defaultImages.find(img => 
                img.name.toLowerCase() === command.parameters?.name?.toLowerCase()
              );
              
              if (matchedImage) {
                responseText += `I'll use your default image "${matchedImage.name}" for your product shot. `;
                command.parameters.imageUrl = matchedImage.url;
                command.parameters.imageId = matchedImage.id;
                await updateLastUsed.mutateAsync(matchedImage.id);
              }
            }
            
            if (command.parameters?.autoGenerate) {
              responseText += `I'll automatically start the generation process.`;
            } else {
              responseText += `You can now add details or customize the generation.`;
            }
            
            result = responseText;
          }
          break;
          
        case "image-to-video":
          if (command.action === "convert") {
            result = `I can help you convert an image to a video. Please navigate to the Image to Video tab or upload an image you'd like to convert.`;
            if (command.parameters?.imageUrl) {
              result = `I'll use the default image "${command.parameters.name}" for your video conversion. You can now add details or customize the settings.`;
            }
          }
          break;
          
        case "product-video":
          if (command.action === "create") {
            result = `I can help you create a product video. Please navigate to the Product Video tab or let me know what product you'd like to feature.`;
            if (command.parameters?.imageUrl) {
              result = `I'll use the default image "${command.parameters.name}" for your product video. You can now add details or customize the settings.`;
            }
          }
          break;
      }

      updateTaskStatus(messageIndex, commandTaskId, "completed", "Command executed successfully");
      
      return result;
      
    } catch (error) {
      console.error("Command execution error:", error);
      return `Sorry, I encountered an error while executing the ${command.feature} ${command.action} command. ${error instanceof Error ? error.message : ""}`;
    }
  };

  const handleListDefaultImages = async (taskId: string, messageIndex: number): Promise<string> => {
    if (!defaultImages || defaultImages.length === 0) {
      updateTaskStatus(messageIndex, taskId, "completed", "No default images found");
      return "You don't have any default images saved yet. You can save an image as default by using the 'Save this image as default' command.";
    }
    
    updateTaskStatus(messageIndex, taskId, "completed", `Found ${defaultImages.length} default images`);
    
    const imagesList = defaultImages.map((img, index) => 
      `${index + 1}. "${img.name}" - saved on ${new Date(img.created_at).toLocaleDateString()}`
    ).join('\n');
    
    return `Here are your default images:\n\n${imagesList}\n\nYou can use any of these images with the "Use default image 'name'" command.`;
  };

  const handleUseDefaultImage = async (parameters: Record<string, any> | undefined, taskId: string, messageIndex: number): Promise<string> => {
    if (!parameters?.imageId || !parameters?.imageUrl) {
      updateTaskStatus(messageIndex, taskId, "error", "No valid default image found");
      return "I couldn't find a default image to use. Please save a default image first or specify the image name.";
    }
    
    await updateLastUsed.mutateAsync(parameters.imageId);
    
    updateTaskStatus(messageIndex, taskId, "completed", `Using default image: ${parameters.name}`);
    return `I'm using your default image "${parameters.name}". You can now continue with your operation.`;
  };

  const handleSaveDefaultImage = async (parameters: Record<string, any> | undefined, taskId: string, messageIndex: number): Promise<string> => {
    if (!parameters?.name) {
      updateTaskStatus(messageIndex, taskId, "error", "No name provided for default image");
      return "To save a default image, please provide a name for it. For example: 'Save this image as default named \"My Product\"'";
    }
    
    updateTaskStatus(messageIndex, taskId, "completed", `Default image request acknowledged: ${parameters.name}`);
    return `I understand you want to save an image as default named "${parameters.name}". Currently, you need to save default images from the generated images panel. In the future, I'll be able to do this directly for you.`;
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
        createTask("Checking for commands"),
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");
      
      console.log('Detecting commands with AI...');
      const detectedCommand = await detectCommand(trimmedInput);
      
      if (detectedCommand) {
        console.log('AI detected command:', detectedCommand);
        
        updateTaskStatus(
          messageIndex,
          assistantMessage.tasks![1].id, 
          "completed", 
          `Detected: ${detectedCommand.action} ${detectedCommand.feature}`
        );
        
        if (detectedCommand.parameters) {
          const additionalParams = extractParameters(trimmedInput, detectedCommand.feature);
          detectedCommand.parameters = { 
            ...detectedCommand.parameters,
            ...additionalParams
          };
        }
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (messageIndex >= 0 && messageIndex < newMessages.length) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              command: detectedCommand
            };
          }
          return newMessages;
        });
        
        const commandResponse = await executeCommand(detectedCommand, messageIndex);
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: commandResponse,
            status: "completed"
          };
          return newMessages;
        });
        
        if (commandResponse) {
          updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "completed");
          setIsLoading(false);
          return;
        }
      } else {
        updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed", "No specific commands detected");
      }
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "in-progress");

      console.log('Sending chat request to LangFlow:', {
        messages: [...messages, userMessage],
        lastMessage: userMessage.content
      });
      
      const { data, error } = await supabase.functions.invoke('chat-with-langflow', {
        body: { 
          messages: [...messages, userMessage]
        }
      });

      console.log('Received response from LangFlow:', data);

      if (error) {
        console.error('Chat error:', error);
        updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "error", "Failed to connect to AI service");
        throw error;
      }

      if (data && data.message) {
        updateTaskStatus(messageIndex, assistantMessage.tasks![2].id, "completed");
        
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
      
      assistantMessage.tasks!.forEach(task => {
        if (task.status === "pending" || task.status === "in-progress") {
          updateTaskStatus(messageIndex, task.id, "error");
        }
      });
      
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
