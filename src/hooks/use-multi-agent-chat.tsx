import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { AgentMessage, Message, Task, Attachment, Command, HandoffRequest, AgentInfo } from "@/types/message";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ToolContext, ToolResult } from "./multi-agent/types";
import { toolExecutor } from "./multi-agent/tool-executor";
import { getToolsForLLM } from "./multi-agent/tools";
import { useMediaUpdates } from "./multi-agent/use-media-updates";

const CHAT_CREDIT_COST = 0.07;
const STORAGE_KEY = "multi_agent_chat_history";

// Define built-in agent types
export const BUILT_IN_AGENT_TYPES = ['main', 'script', 'image', 'tool', 'scene'];
export type AgentType = string;

export const useMultiAgentChat = () => {
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
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [handoffComplete, setHandoffComplete] = useState(false);
  const [usePerformanceModel, setUsePerformanceModel] = useState(false);

  const updateMessage = useCallback((index: number, updates: Partial<Message>) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (index >= 0 && index < newMessages.length) {
        newMessages[index] = {
          ...newMessages[index],
          ...updates
        };
      }
      return newMessages;
    });
  }, []);

  const { createMediaGenerationTask } = useMediaUpdates({
    messages,
    updateMessage
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [messages]);

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

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  }, []);

  const parseToolCommand = (text: string): Command | null => {
    try {
      const toolMatch = text.match(/TOOL:\s*([a-z0-9-]+)/i);
      const paramsMatch = text.match(/PARAMETERS:\s*(\{.+\})/s);
      
      if (!toolMatch) {
        console.log("No tool command found in text");
        return null;
      }
      
      const feature = toolMatch[1].toLowerCase();
      let parameters = {};
      
      if (paramsMatch) {
        try {
          parameters = JSON.parse(paramsMatch[1]);
          console.log(`Parsed tool parameters:`, parameters);
        } catch (e) {
          console.error("Error parsing tool parameters:", e);
        }
      }
      
      return {
        feature: feature as Command["feature"],
        action: "create",
        parameters,
        confidence: 0.9
      };
    } catch (error) {
      console.error("Error parsing tool command:", error);
      return null;
    }
  };

  const executeToolCommand = async (command: Command): Promise<ToolResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log(`Executing tool command: ${command.feature}`);
      
      const toolContext: ToolContext = {
        userId: user.id,
        creditsRemaining: userCredits?.credits_remaining || 0,
        attachments: pendingAttachments,
        selectedTool: command.feature,
        previousOutputs: {}
      };
      
      return await toolExecutor.executeCommand(command, toolContext);
    } catch (error) {
      console.error("Error executing tool command:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      };
    }
  };

  const isBuiltInAgent = (agentType: string): boolean => {
    return BUILT_IN_AGENT_TYPES.includes(agentType.toLowerCase());
  };

  const handleAgentHandoff = async (handoffRequest: HandoffRequest) => {
    console.log("Handling agent handoff:", handoffRequest);
    
    if (!handoffRequest || !handoffRequest.targetAgent) {
      console.log("Invalid handoff request:", handoffRequest);
      return;
    }
    
    const targetAgent = handoffRequest.targetAgent.trim();
    if (!targetAgent) {
      console.error("Empty target agent in handoff request");
      return;
    }
    
    // Determine if this is a built-in agent type
    const isBuiltIn = isBuiltInAgent(targetAgent);
    
    const handoffMessage: Message = {
      role: "assistant",
      content: `I'm transferring you to the ${targetAgent} agent for better assistance.\n\nReason: ${handoffRequest.reason || "Specialized knowledge required"}`,
      status: "completed",
      agentType: activeAgent,
      tasks: [
        {
          id: uuidv4(),
          name: `Transferring to ${targetAgent} agent`,
          status: "completed"
        }
      ]
    };
    
    console.log(`Handoff in progress: From ${activeAgent} to ${targetAgent} (built-in: ${isBuiltIn})`);
    
    setMessages(prev => [...prev, handoffMessage]);
    setActiveAgent(targetAgent);
    setHandoffComplete(true);
    toast.info(`Transferred to ${targetAgent} agent for better assistance.`);
  };

  const continueConversationAfterHandoff = async () => {
    console.log("Auto-continuing conversation after handoff to agent:", activeAgent);
    
    if (!handoffComplete) return;
    
    setHandoffComplete(false);
    
    const continuationMessage: Message = { 
      role: "assistant", 
      content: "I'm now assisting you as the new specialized agent. Looking at the context of your request...", 
      status: "thinking",
      agentType: activeAgent,
      tasks: [
        createTask(`Analyzing conversation context`),
        createTask("Preparing response")
      ]
    };

    setMessages(prev => [...prev, continuationMessage]);
    setIsLoading(true);
    
    const messageIndex = messages.length;

    try {
      const apiMessages = formatAgentMessagesWithAttachments(messages, []);
      
      updateTaskStatus(messageIndex, continuationMessage.tasks![0].id, "in-progress");
      
      const isBuiltIn = isBuiltInAgent(activeAgent);
      const isCustomAgent = !isBuiltIn;
      
      console.log("Sending continuation request to multi-agent-chat function:", {
        agentType: activeAgent, 
        isBuiltIn,
        isCustomAgent, 
        messageCount: apiMessages.length,
        isHandoffContinuation: true,
        usePerformanceModel: usePerformanceModel
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const response = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          messages: apiMessages,
          agentType: activeAgent,
          userId: user.id,
          contextData: {
            hasAttachments: false,
            availableTools: activeAgent === "tool" ? getToolsForLLM() : undefined,
            isCustomAgent,
            isHandoffContinuation: true,
            usePerformanceModel
          }
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to get response from agent");
      }
      
      if (response.data.handoffFailed) {
        throw new Error(response.data.error || "Failed to transfer to the requested agent");
      }
      
      updateTaskStatus(messageIndex, continuationMessage.tasks![0].id, "completed");
      updateTaskStatus(messageIndex, continuationMessage.tasks![1].id, "in-progress");
      
      const { completion, status, handoffRequest, modelUsed, fallbackUsed } = response.data;
      console.log("API response on continuation:", { 
        completionPreview: completion ? completion.slice(0, 100) + "..." : "No completion", 
        status, 
        handoffRequest,
        modelUsed,
        fallbackUsed
      });
      
      if (fallbackUsed) {
        toast.info(`Using alternative model for better reliability.`);
      }
      
      let finalContent = completion;
      let command: Command | null = null;
      
      if (activeAgent === "tool") {
        command = parseToolCommand(completion);
        
        if (command) {
          const toolTaskId = uuidv4();
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              const mediaTask = createMediaGenerationTask(command!);
              const updatedTasks = [
                ...(newMessages[messageIndex].tasks || []),
                {
                  id: toolTaskId,
                  name: `Executing ${command!.feature}`,
                  status: "pending" as Task["status"]
                },
                mediaTask
              ];
              
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                tasks: updatedTasks,
                command: command,
                modelUsed
              };
            }
            return newMessages;
          });
          
          try {
            const toolResult = await executeToolCommand(command);
            
            finalContent = `${completion}\n\n${toolResult.message}`;
            
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              toolResult.success ? "completed" : "error", 
              toolResult.success ? undefined : toolResult.message
            );

            if (toolResult.success && toolResult.requestId && command.parameters) {
              command.parameters.requestId = toolResult.requestId;
            }
          } catch (toolError) {
            console.error("Error executing tool command:", toolError);
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              "error", 
              toolError instanceof Error ? toolError.message : "Unknown error"
            );
            finalContent = `${completion}\n\nError executing tool: ${toolError instanceof Error ? toolError.message : "Unknown error"}`;
          }
        }
      }
      
      updateTaskStatus(messageIndex, continuationMessage.tasks![1].id, "completed");
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: finalContent,
            status: "completed",
            command: command,
            handoffRequest: handoffRequest,
            modelUsed
          };
        }
        return newMessages;
      });
      
      if (handoffRequest) {
        console.log("Nested handoff request detected:", handoffRequest);
        handleAgentHandoff(handoffRequest);
      }
      
      refetchCredits();
    } catch (error) {
      console.error("Error in continueConversationAfterHandoff:", error);
      
      updateMessage(messageIndex, {
        content: `I tried to transfer you to the ${activeAgent} agent, but encountered an issue. ${error instanceof Error ? error.message : "Please try another agent or continue with me."}\n\nHow else can I assist you?`,
        status: "error",
        tasks: [
          {
            id: uuidv4(),
            name: `Handoff to ${activeAgent} failed`,
            status: "error",
            details: error instanceof Error ? error.message : "Unknown error"
          }
        ]
      });
      
      setActiveAgent("main");
      setHandoffComplete(false);
      setIsLoading(false);
      
      toast.error(`Could not connect to the ${activeAgent} agent. Falling back to main assistant.`);
    }
  };

  const formatAgentMessagesWithAttachments = (messages: Message[], pendingAttachments: Attachment[]): AgentMessage[] => {
    return messages.map(msg => {
      let messageContent = msg.content;
      
      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const attachmentDescriptions = msg.attachments.map(att => 
          `[Attached ${att.type}: ${att.name}, URL: ${att.url}]`
        ).join("\n");
        
        if (messageContent) {
          messageContent = `${messageContent}\n\n${attachmentDescriptions}`;
        } else {
          messageContent = attachmentDescriptions;
        }
      }
      
      return {
        role: msg.role,
        content: messageContent,
        ...(msg.agentType && msg.agentType !== activeAgent ? 
            { name: `previous_agent_${msg.agentType}` } : {})
      };
    });
  };

  useEffect(() => {
    if (handoffComplete && !isLoading) {
      continueConversationAfterHandoff();
    }
  }, [handoffComplete, activeAgent, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && pendingAttachments.length === 0) || isLoading) return;

    if (!userCredits || userCredits.credits_remaining < CHAT_CREDIT_COST) {
      toast.error(`You need at least ${CHAT_CREDIT_COST} credits to send a message.`);
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: trimmedInput,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    };

    const assistantMessage: Message = { 
      role: "assistant", 
      content: "Processing your request...", 
      status: "thinking",
      agentType: activeAgent,
      tasks: [
        createTask(`Consulting ${activeAgent} agent`),
        createTask("Preparing response")
      ]
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);
    
    const messageIndex = messages.length + 1;

    try {
      const apiMessages = formatAgentMessagesWithAttachments([...messages, userMessage], pendingAttachments);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      
      const isBuiltIn = isBuiltInAgent(activeAgent);
      const isCustomAgent = !isBuiltIn;
      
      console.log("Sending request to multi-agent-chat function:", {
        agentType: activeAgent, 
        isBuiltIn,
        isCustomAgent, 
        messageCount: apiMessages.length,
        hasAttachments: pendingAttachments.length > 0,
        usePerformanceModel: usePerformanceModel
      });
      
      const response = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          messages: apiMessages,
          agentType: activeAgent,
          userId: user.id,
          contextData: {
            hasAttachments: pendingAttachments.length > 0,
            attachmentTypes: pendingAttachments.map(a => a.type),
            availableTools: activeAgent === "tool" ? getToolsForLLM() : undefined,
            isCustomAgent,
            usePerformanceModel
          }
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to get response from agent");
      }
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");
      
      const { completion, status, handoffRequest, modelUsed, fallbackUsed } = response.data;
      console.log("API response:", { 
        completionPreview: completion ? completion.slice(0, 100) + "..." : "No completion", 
        status, 
        handoffRequest,
        modelUsed,
        fallbackUsed
      });
      
      if (fallbackUsed) {
        toast.info(`Using alternative model for better reliability.`);
      }
      
      let finalContent = completion;
      let command: Command | null = null;
      
      if (activeAgent === "tool") {
        command = parseToolCommand(completion);
        
        if (command) {
          const toolTaskId = uuidv4();
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              const mediaTask = createMediaGenerationTask(command!);
              const updatedTasks = [
                ...(newMessages[messageIndex].tasks || []),
                {
                  id: toolTaskId,
                  name: `Executing ${command!.feature}`,
                  status: "pending" as Task["status"]
                },
                mediaTask
              ];
              
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                tasks: updatedTasks,
                command: command,
                modelUsed
              };
            }
            return newMessages;
          });
          
          try {
            const toolResult = await executeToolCommand(command);
            
            finalContent = `${completion}\n\n${toolResult.message}`;
            
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              toolResult.success ? "completed" : "error", 
              toolResult.success ? undefined : toolResult.message
            );

            if (toolResult.success && toolResult.requestId && command.parameters) {
              command.parameters.requestId = toolResult.requestId;
            }
          } catch (toolError) {
            console.error("Error executing tool command:", toolError);
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              "error", 
              toolError instanceof Error ? toolError.message : "Unknown error"
            );
            finalContent = `${completion}\n\nError executing tool: ${toolError instanceof Error ? toolError.message : "Unknown error"}`;
          }
        }
      }
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "completed");
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: finalContent,
            status: "completed",
            command: command,
            handoffRequest: handoffRequest,
            modelUsed
          };
        }
        return newMessages;
      });
      
      if (handoffRequest) {
        console.log("Handoff request detected:", handoffRequest);
        handleAgentHandoff(handoffRequest);
      }
      
      refetchCredits();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      const messageContent = errorMessage.includes("custom agent") || errorMessage.includes("handoff")
        ? `I couldn't transfer to the requested agent. ${errorMessage}`
        : `Sorry, an error occurred: ${errorMessage}`;
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          const tasks = newMessages[messageIndex].tasks?.map(task => ({
            ...task,
            status: task.status === "completed" ? "completed" as const : "error" as const
          }));
          
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: messageContent,
            status: "error",
            tasks
          };
        }
        return newMessages;
      });
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAgent = useCallback((agentType: AgentType) => {
    setActiveAgent(agentType);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAttachments([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const togglePerformanceMode = useCallback(() => {
    setUsePerformanceModel(prev => !prev);
    toast.info(usePerformanceModel ? 
      "Using standard model for higher quality responses." : 
      "Using performance model for faster responses."
    );
  }, [usePerformanceModel]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    activeAgent,
    userCredits,
    pendingAttachments,
    usePerformanceModel,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateMessage,
    togglePerformanceMode
  };
};
