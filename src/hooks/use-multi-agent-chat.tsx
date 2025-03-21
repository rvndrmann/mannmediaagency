
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AgentRunner } from "./multi-agent/runner";

// Define built-in agent types
export const BUILT_IN_AGENT_TYPES = ['main', 'script', 'image', 'tool', 'scene'];
export type AgentType = typeof BUILT_IN_AGENT_TYPES[number] | string;

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
  const [debugMode, setDebugMode] = useState(false);

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

  // Debug mode handler
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
    toast.info(debugMode ? 
      "Debug mode disabled." : 
      "Debug mode enabled. Check console for detailed logs."
    );
  }, [debugMode]);

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

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && pendingAttachments.length === 0) || isLoading) return;

    if (!userCredits || userCredits.credits_remaining < 0.07) {
      toast.error("You need at least 0.07 credits to send a message.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if the active agent is a custom agent
      const isCustomAgent = !BUILT_IN_AGENT_TYPES.includes(activeAgent);

      // Create user message
      const userMessage: Message = {
        role: "user",
        content: trimmedInput,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
      };
      
      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);

      // Create AgentRunner instance
      const runner = new AgentRunner(activeAgent, {
        usePerformanceModel,
        enableDirectToolExecution,
        tracingDisabled: !tracingEnabled,
        metadata: {
          userId: user.id,
          sessionId: currentConversationId
        },
        runId: uuidv4(),
        groupId: currentConversationId
      }, {
        onMessage: (message) => {
          setMessages(prev => [...prev, message]);
        },
        onError: (error) => {
          toast.error(error);
        },
        onHandoffEnd: (toAgent) => {
          setActiveAgent(toAgent);
        }
      });

      if (debugMode) {
        console.log("Debug Mode - Starting Agent Run:", {
          agent: activeAgent,
          isCustomAgent,
          usePerformanceModel,
          enableDirectToolExecution,
          tracingEnabled,
          attachments: pendingAttachments.length
        });
      }

      // Run the agent
      await runner.run(trimmedInput, pendingAttachments, user.id);
      
      // Clear input and attachments
      setInput("");
      setPendingAttachments([]);
      
      // Refresh credits
      refetchCredits();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage);
      
      if (debugMode) {
        console.error("Agent run error:", error);
      }
    } finally {
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
    debugMode,
    currentConversationId,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateMessage,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    toggleDebugMode
  };
};
