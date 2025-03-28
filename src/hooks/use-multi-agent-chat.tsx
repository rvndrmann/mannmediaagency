import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, MessageType, ContinuityData } from "@/types/message";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AgentRunner } from "./multi-agent/runner/AgentRunner";
import { AgentType as RunnerAgentType } from "./multi-agent/runner/types";

export type AgentType = RunnerAgentType;

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
  const [agentInstructions, setAgentInstructions] = useState<Record<AgentType, string>>({
    main: "",
    script: "",
    image: "",
    tool: "",
    scene: ""
  });
  const [handoffInProgress, setHandoffInProgress] = useState(false);

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem("agent_instructions", JSON.stringify(agentInstructions));
    } catch (e) {
      console.error("Error saving agent instructions to localStorage:", e);
    }
  }, [agentInstructions]);

  useEffect(() => {
    try {
      const savedInstructions = localStorage.getItem("agent_instructions");
      if (savedInstructions) {
        const parsedInstructions = JSON.parse(savedInstructions);
        setAgentInstructions(prev => ({
          ...prev,
          ...parsedInstructions
        }));
      }
    } catch (e) {
      console.error("Error loading agent instructions from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (activeToolExecutions.length === 0) return;
    
    const intervalId = setInterval(async () => {
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
          
          if (data.status === 'finished' || data.status === 'stopped' || data.status === 'failed') {
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

  const toolAvailable = useCallback((toolName: string) => {
    return true;
  }, []);

  const addHandoffMessage = useCallback((fromAgent: AgentType, toAgent: AgentType, reason: string) => {
    const handoffMessage: Message = {
      id: uuidv4(),
      role: "system",
      content: `Transferring from ${fromAgent} agent to ${toAgent} agent: ${reason}`,
      createdAt: new Date().toISOString(),
      status: "completed",
      type: "handoff" as MessageType,
      continuityData: {
        fromAgent,
        toAgent,
        reason,
        timestamp: new Date().toISOString(),
        preserveHistory: true
      }
    };
    setMessages(prev => [...prev, handoffMessage]);
    
    setHandoffInProgress(true);
    
    setTimeout(() => {
      setHandoffInProgress(false);
    }, 2000);
    
    return handoffMessage;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const isCustomAgent = !BUILT_IN_AGENT_TYPES.includes(activeAgent);
      console.log("Creating agent runner for agent type:", activeAgent);

      const browserUseApiKey = import.meta.env.VITE_BROWSER_USE_API_KEY || "";

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

      const runner = new AgentRunner(activeAgent, contextData, {
        onMessage: (message) => {
          console.log("Received message from agent:", message);
          setMessages(prev => [...prev, message]);
        },
        onError: (error) => {
          console.error("Agent error:", error);
          toast.error(error);
        },
        onHandoffStart: (fromAgent, toAgent, reason) => {
          console.log(`Handoff starting from ${fromAgent} to ${toAgent}: ${reason}`);
          addHandoffMessage(fromAgent, toAgent, reason);
        },
        onHandoffEnd: (toAgent) => {
          console.log("Handling handoff to:", toAgent);
          setActiveAgent(toAgent);
        },
        onToolExecution: (toolName, params) => {
          if (toolName === 'browser-use' && params.taskId) {
            setActiveToolExecutions(prev => [...prev, params.taskId]);
          }
        }
      });

      console.log("Running agent with input:", trimmedInput);
      
      await runner.run(trimmedInput, pendingAttachments, user.id);
      
      setInput("");
      setPendingAttachments([]);
      
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

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  }, []);

  const switchAgent = useCallback((agentType: AgentType) => {
    setActiveAgent(agentType);
  }, []);

  const updateAgentInstructions = useCallback((agentType: AgentType, instructions: string) => {
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    toast.success(`Updated ${agentType} agent instructions`);
  }, []);

  const getAgentInstructions = useCallback((agentType: AgentType) => {
    return agentInstructions[agentType] || "";
  }, [agentInstructions]);

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
    handoffInProgress,
    agentInstructions,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateMessage,
    updateAgentInstructions,
    getAgentInstructions,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    addHandoffMessage,
    handoffInProgress
  };
};
