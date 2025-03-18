
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { AgentMessage, Message, Task, Attachment, Command, HandoffRequest } from "@/types/message";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ToolContext, ToolResult } from "./multi-agent/types";
import { toolExecutor } from "./multi-agent/tool-executor";
import { getToolsForLLM } from "./multi-agent/tools";

const CHAT_CREDIT_COST = 0.07;
const STORAGE_KEY = "multi_agent_chat_history";

export type AgentType = "main" | "script" | "image" | "tool";

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
  
  // Cache messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [messages]);
  
  // Fetch user credits
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
      
      if (!toolMatch) return null;
      
      const feature = toolMatch[1].toLowerCase();
      let parameters = {};
      
      if (paramsMatch) {
        try {
          parameters = JSON.parse(paramsMatch[1]);
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
  
  const handleAgentHandoff = (handoffRequest: HandoffRequest) => {
    if (!handoffRequest) return;
    
    // Create a handoff message
    const handoffMessage: Message = {
      role: "assistant",
      content: `I'm transferring you to the ${handoffRequest.targetAgent} agent for better assistance. Reason: ${handoffRequest.reason}`,
      status: "completed",
      agentType: activeAgent,
      tasks: [
        {
          id: uuidv4(),
          name: `Transferring to ${handoffRequest.targetAgent} agent`,
          status: "completed"
        }
      ]
    };
    
    // Add the handoff message to the conversation
    setMessages(prev => [...prev, handoffMessage]);
    
    // Switch the active agent
    setActiveAgent(handoffRequest.targetAgent as AgentType);
    
    // Show notification to user
    toast.info(`Transferred to ${handoffRequest.targetAgent} agent for better assistance.`);
  };
  
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
      // Format messages for the API
      const apiMessages: AgentMessage[] = messages
        .filter(msg => msg.role === "user" || (msg.role === "assistant" && msg.agentType === activeAgent))
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
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
      
      // Call the multi-agent-chat function
      const response = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          messages: apiMessages,
          agentType: activeAgent,
          userId: user.id,
          contextData: {
            hasAttachments: pendingAttachments.length > 0,
            attachmentTypes: pendingAttachments.map(a => a.type),
            availableTools: activeAgent === "tool" ? getToolsForLLM() : undefined
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
              const updatedTasks = [
                ...(newMessages[messageIndex].tasks || []),
                {
                  id: toolTaskId,
                  name: `Executing ${command!.feature}`,
                  status: "pending" as Task["status"]
                }
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
    removeAttachment
  };
};
