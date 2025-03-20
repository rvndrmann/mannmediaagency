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

  // Helper function to update a specific message
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
  
  // Use our new media updates hook
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
      // Try to extract command from format like: "TOOL: product-shot-v1, PARAMETERS: {\"prompt\": \"office desk\", \"imageUrl\": \"https://example.com/image.jpg\"}"
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
      // Get user ID for context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log(`Executing tool command: ${command.feature}`);
      
      // Create tool context
      const toolContext: ToolContext = {
        userId: user.id,
        creditsRemaining: userCredits?.credits_remaining || 0,
        attachments: pendingAttachments,
        selectedTool: command.feature,
        previousOutputs: {} // We could store previous outputs here if needed
      };
      
      // Execute the tool
      return await toolExecutor.executeCommand(command, toolContext);
      
    } catch (error) {
      console.error("Error executing tool command:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      };
    }
  };
  
  // Enhanced handler for agent handoffs that works with custom agents and continues the conversation
  const handleAgentHandoff = async (handoffRequest: HandoffRequest) => {
    console.log("Handling agent handoff:", handoffRequest);
    
    if (!handoffRequest || !handoffRequest.targetAgent) {
      console.log("Invalid handoff request:", handoffRequest);
      return;
    }
    
    // Validate target agent
    const targetAgent = handoffRequest.targetAgent.trim();
    if (!targetAgent) {
      console.error("Empty target agent in handoff request");
      return;
    }
    
    // Create a handoff message
    const handoffMessage: Message = {
      role: "assistant",
      content: `I'm transferring you to the ${targetAgent} agent for better assistance. Reason: ${handoffRequest.reason || "Specialized knowledge required"}`,
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
    
    console.log(`Handoff in progress: From ${activeAgent} to ${targetAgent}`);
    
    // Add the handoff message to the conversation
    setMessages(prev => [...prev, handoffMessage]);
    
    // Switch the active agent
    setActiveAgent(targetAgent);
    
    // Set handoff complete flag to trigger auto-continuation
    setHandoffComplete(true);
    
    // Show notification to user
    toast.info(`Transferred to ${targetAgent} agent for better assistance.`);
  };

  // New method to auto-continue conversation after handoff
  const continueConversationAfterHandoff = async () => {
    console.log("Auto-continuing conversation after handoff");
    
    if (!handoffComplete) return;
    
    // Reset flag first to prevent multiple continuations
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
      // Format messages for the API - include ALL previous messages for context
      // but mark them with roles for the AI to understand the flow
      const apiMessages: AgentMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        // Optional name field to help the AI understand message origins
        ...(msg.agentType && msg.agentType !== activeAgent ? 
            { name: `previous_agent_${msg.agentType}` } : {})
      }));
      
      updateTaskStatus(messageIndex, continuationMessage.tasks![0].id, "in-progress");
      
      // Determine if the active agent is a custom agent
      const isCustomAgent = !['main', 'script', 'image', 'tool'].includes(activeAgent);
      
      console.log("Sending continuation request to multi-agent-chat function:", {
        agentType: activeAgent, 
        isCustomAgent, 
        messageCount: apiMessages.length,
        isHandoffContinuation: true
      });
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Call the multi-agent-chat function
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
            isHandoffContinuation: true
          }
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to get response from agent");
      }
      
      updateTaskStatus(messageIndex, continuationMessage.tasks![0].id, "completed");
      updateTaskStatus(messageIndex, continuationMessage.tasks![1].id, "in-progress");
      
      // Handle completed response
      const { completion, status, handoffRequest } = response.data;
      console.log("API response on continuation:", { 
        completionPreview: completion ? completion.slice(0, 100) + "..." : "No completion", 
        status, 
        handoffRequest 
      });
      
      // For tool agent, try to parse and execute commands
      let finalContent = completion;
      let command: Command | null = null;
      
      if (activeAgent === "tool") {
        command = parseToolCommand(completion);
        
        if (command) {
          // Add a task for executing the tool command
          const toolTaskId = uuidv4();
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              // Add media generation task if applicable
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
                command: command
              };
            }
            return newMessages;
          });
          
          try {
            // Execute the tool command
            const toolResult = await executeToolCommand(command);
            
            // Update the final content to include tool execution results
            finalContent = `${completion}\n\n${toolResult.message}`;
            
            // Mark the tool task as completed or failed
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              toolResult.success ? "completed" : "error", 
              toolResult.success ? undefined : toolResult.message
            );

            // Add request ID to parameters for tracking
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
      
      // Update the assistant message with the response
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: finalContent,
            status: "completed",
            command: command,
            handoffRequest: handoffRequest
          };
        }
        return newMessages;
      });
      
      // Handle nested handoff if present
      if (handoffRequest) {
        console.log("Nested handoff request detected:", handoffRequest);
        handleAgentHandoff(handoffRequest);
      }
      
      // Refresh user credits
      refetchCredits();
      
    } catch (error) {
      console.error("Error in continueConversationAfterHandoff:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          const tasks = newMessages[messageIndex].tasks?.map(task => ({
            ...task,
            status: task.status === "completed" ? "completed" as const : "error" as const
          }));
          
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: `Sorry, an error occurred while trying to continue the conversation: ${errorMessage}`,
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
  
  // Effect to trigger continuation after handoff
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
      // Format messages for the API - now keeping all messages for context
      // but potentially marking them with different roles to guide the AI
      const apiMessages: AgentMessage[] = messages.map(msg => {
        // For all messages, keep them in the conversation history
        return {
          role: msg.role,
          content: msg.content,
          // Add name attribute for messages from other agents to help the model understand context
          ...(msg.agentType && msg.agentType !== activeAgent ? 
              { name: `previous_agent_${msg.agentType}` } : {})
        };
      });
      
      // Add current user message with attachment info
      let userContent = trimmedInput;
      if (pendingAttachments.length > 0) {
        const attachmentDescriptions = pendingAttachments.map(att => 
          `[Attached ${att.type}: ${att.name}, URL: ${att.url}]`
        ).join("\n");
        
        userContent = `${trimmedInput}\n\n${attachmentDescriptions}`;
      }
      
      apiMessages.push({ role: "user", content: userContent });
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "in-progress");
      
      // Determine if the active agent is a custom agent
      const isCustomAgent = !['main', 'script', 'image', 'tool'].includes(activeAgent);
      
      console.log("Sending request to multi-agent-chat function:", {
        agentType: activeAgent, 
        isCustomAgent, 
        messageCount: apiMessages.length,
        hasAttachments: pendingAttachments.length > 0
      });
      
      // Call the multi-agent-chat function
      const response = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          messages: apiMessages,
          agentType: activeAgent,
          userId: user.id,
          contextData: {
            hasAttachments: pendingAttachments.length > 0,
            attachmentTypes: pendingAttachments.map(a => a.type),
            availableTools: activeAgent === "tool" ? getToolsForLLM() : undefined,
            isCustomAgent
          }
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to get response from agent");
      }
      
      updateTaskStatus(messageIndex, assistantMessage.tasks![0].id, "completed");
      updateTaskStatus(messageIndex, assistantMessage.tasks![1].id, "in-progress");
      
      // Handle completed response
      const { completion, status, handoffRequest } = response.data;
      console.log("API response:", { 
        completionPreview: completion ? completion.slice(0, 100) + "..." : "No completion", 
        status, 
        handoffRequest 
      });
      
      // For tool agent, try to parse and execute commands
      let finalContent = completion;
      let command: Command | null = null;
      
      if (activeAgent === "tool") {
        command = parseToolCommand(completion);
        
        if (command) {
          // Add a task for executing the tool command
          const toolTaskId = uuidv4();
          setMessages(prev => {
            const newMessages = [...prev];
            if (messageIndex >= 0 && messageIndex < newMessages.length) {
              // Add media generation task if applicable
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
                command: command
              };
            }
            return newMessages;
          });
          
          try {
            // Execute the tool command
            const toolResult = await executeToolCommand(command);
            
            // Update the final content to include tool execution results
            finalContent = `${completion}\n\n${toolResult.message}`;
            
            // Mark the tool task as completed or failed
            updateTaskStatus(
              messageIndex, 
              toolTaskId, 
              toolResult.success ? "completed" : "error", 
              toolResult.success ? undefined : toolResult.message
            );

            // Add request ID to parameters for tracking
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
      
      // Update the assistant message with the response
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: finalContent,
            status: "completed",
            command: command,
            handoffRequest: handoffRequest
          };
        }
        return newMessages;
      });
      
      // Handle agent handoff if present
      if (handoffRequest) {
        console.log("Handoff request detected:", handoffRequest);
        handleAgentHandoff(handoffRequest);
      }
      
      // Refresh user credits
      refetchCredits();
      
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (messageIndex >= 0 && messageIndex < newMessages.length) {
          const tasks = newMessages[messageIndex].tasks?.map(task => ({
            ...task,
            status: task.status === "completed" ? "completed" as const : "error" as const
          }));
          
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: `Sorry, an error occurred: ${errorMessage}`,
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

  return {
    messages,
    input,
    setInput,
    isLoading,
    activeAgent,
    userCredits,
    pendingAttachments,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateMessage
  };
};
