
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AgentRunner } from "./multi-agent/runner/AgentRunner";
import { AgentType } from "./multi-agent/runner/types";

// Define built-in agent types
export const BUILT_IN_AGENT_TYPES = ['main', 'script', 'image', 'tool', 'scene'];

const STORAGE_KEY = "multi_agent_chat_history";

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
  const [usePerformanceModel, setUsePerformanceModel] = useState(false);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState(true);
  const [tracingEnabled, setTracingEnabled] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string>(uuidv4());
  const [activeToolExecutions, setActiveToolExecutions] = useState<string[]>([]);

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

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [messages]);

  // Fetch task status for active tool executions
  useEffect(() => {
    if (activeToolExecutions.length === 0) return;
    
    const intervalId = setInterval(async () => {
      // Check task statuses
      for (const taskId of activeToolExecutions) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;
          
          const { data, error } = await supabase.functions.invoke('browser-use-api', {
            body: { action: 'getTask', taskId }
          });
          
          if (error) {
            console.error("Error checking task status:", error);
            continue;
          }
          
          // If the task is completed, update the message and remove from active executions
          if (data.status === 'finished' || data.status === 'stopped' || data.status === 'failed') {
            // Find the tool message
            updateToolMessage(taskId, data);
            setActiveToolExecutions(prev => prev.filter(id => id !== taskId));
          }
        } catch (error) {
          console.error("Error checking task status:", error);
        }
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [activeToolExecutions]);

  // Update message helper
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

  // Update tool message by task ID
  const updateToolMessage = useCallback((taskId: string, taskData: any) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const index = newMessages.findIndex(msg => 
        msg.role === 'tool' && 
        msg.tool_arguments && 
        JSON.parse(msg.tool_arguments).taskId === taskId
      );
      
      if (index >= 0) {
        newMessages[index] = {
          ...newMessages[index],
          content: `Tool execution ${taskData.status}: ${taskData.output || taskData.message || ''}`,
          status: taskData.status === 'finished' ? 'completed' : 
                 taskData.status === 'failed' ? 'error' : 
                 'working'
        };
      }
      
      return newMessages;
    });
  }, []);

  // Helper function to add a message
  const addMessage = useCallback((text: string, type: string, attachments?: Attachment[]) => {
    const message: Message = {
      id: uuidv4(),
      role: type as any,
      content: text,
      createdAt: new Date().toISOString(),
      attachments: attachments
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // Helper function to check if a tool is available
  const toolAvailable = useCallback((toolName: string) => {
    // In a real implementation, this would check if the tool is available
    return true;
  }, []);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent form submission behavior
    if (e) {
      e.preventDefault();
    }
    
    const trimmedInput = input.trim();
    console.log("Handling submit with input:", trimmedInput, "attachments:", pendingAttachments.length);
    
    if ((!trimmedInput && pendingAttachments.length === 0) || isLoading) {
      console.log("Aborting submission - empty input or already loading");
      return;
    }

    if (!userCredits || userCredits.credits_remaining < 0.07) {
      toast.error("You need at least 0.07 credits to send a message.");
      return;
    }

    console.log("Setting isLoading to true");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if the active agent is a custom agent
      const isCustomAgent = !BUILT_IN_AGENT_TYPES.includes(activeAgent);
      console.log("Creating agent runner for agent type:", activeAgent);

      // Get browserUseApiKey from environment or use a default
      const browserUseApiKey = import.meta.env.VITE_BROWSER_USE_API_KEY || "";

      // Create context data for the agent
      const contextData = {
        usePerformanceModel,
        enableDirectToolExecution,
        tracingDisabled: !tracingEnabled,
        metadata: {
          userId: user.id,
          sessionId: currentConversationId,
          creditsRemaining: userCredits?.credits_remaining,
          browserUseApiKey
        },
        runId: uuidv4(),
        groupId: currentConversationId,
        supabase,
        userId: user.id,
        addMessage,
        toolAvailable
      };

      // Create AgentRunner instance
      const runner = new AgentRunner(activeAgent, contextData, {
        onMessage: (message) => {
          console.log("Received message from agent:", message);
          setMessages(prev => [...prev, message]);
        },
        onError: (error) => {
          console.error("Agent error:", error);
          toast.error(error);
        },
        onHandoffEnd: (toAgent) => {
          console.log("Handling handoff to:", toAgent);
          setActiveAgent(toAgent);
        },
        onToolExecution: (toolName, params) => {
          // If it's a browser-use tool, track the task ID
          if (toolName === 'browser-use' && params.taskId) {
            setActiveToolExecutions(prev => [...prev, params.taskId]);
          }
        }
      });

      console.log("Running agent with input:", trimmedInput);
      
      // Run the agent (the agent runner will add the user message internally)
      await runner.run(trimmedInput, pendingAttachments, user.id);
      
      // Clear input and attachments
      setInput("");
      setPendingAttachments([]);
      
      // Refresh credits
      refetchCredits();
      
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage);
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  };

  // Attachment handlers
  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  }, []);

  // Agent management
  const switchAgent = useCallback((agentType: AgentType) => {
    setActiveAgent(agentType);
  }, []);

  // Chat management
  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAttachments([]);
    setCurrentConversationId(uuidv4());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const togglePerformanceMode = useCallback(() => {
    setUsePerformanceModel(prev => !prev);
    toast.info(usePerformanceModel ? 
      "Using standard model for higher quality responses." : 
      "Using performance model for faster responses."
    );
  }, [usePerformanceModel]);

  const toggleDirectToolExecution = useCallback(() => {
    setEnableDirectToolExecution(prev => !prev);
    toast.info(enableDirectToolExecution ? 
      "Tools now require handoff to tool agent." : 
      "Enabled direct tool execution from any agent."
    );
  }, [enableDirectToolExecution]);

  const toggleTracing = useCallback(() => {
    setTracingEnabled(prev => !prev);
    toast.info(tracingEnabled ? 
      "Tracing disabled for this session." : 
      "Tracing enabled for this session."
    );
  }, [tracingEnabled]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    activeAgent,
    userCredits,
    pendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    currentConversationId,
    activeToolExecutions,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateMessage,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing
  };
};
