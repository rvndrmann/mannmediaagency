import { useState, useCallback, useEffect, useRef } from "react";
import { Message, Attachment, ContinuityData } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentRunner } from "./multi-agent/runner/AgentRunner";
import { supabase } from "@/integrations/supabase/client";
import { RunnerContext, RunnerCallbacks } from "./multi-agent/runner/types";
import { MessageType } from "@/types/message";

export type { AgentType } from "./multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  onAgentSwitch?: (from: string, to: string) => void;
}

const initialMessages: Message[] = [
  {
    id: '1',
    content: 'Hello! How can I help you today?',
    role: 'assistant' as MessageType,
    createdAt: new Date().toISOString(),
  },
];

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || initialMessages);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<string>("main");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>({ credits_remaining: 100 });
  const [usePerformanceModel, setUsePerformanceModel] = useState<boolean>(false);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState<boolean>(false);
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(false);
  const [handoffInProgress, setHandoffInProgress] = useState<boolean>(false);
  const [fromAgent, setFromAgent] = useState<string>("main");
  const [toAgent, setToAgent] = useState<string>("main");
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
    main: "You are a helpful AI assistant focused on general tasks.",
    script: "You specialize in writing scripts and creative content.",
    image: "You specialize in creating detailed image prompts.",
    tool: "You specialize in executing tools and technical tasks.",
    scene: "You specialize in creating detailed visual scene descriptions."
  });
  
  const agentRunnerRef = useRef<AgentRunner | null>(null);
  const groupIdRef = useRef<string>(uuidv4());
  
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_credits')
            .select('credits_remaining')
            .eq('user_id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user credits:", error);
          } else if (data) {
            setUserCredits(data);
          }
        }
      } catch (error) {
        console.error("Error in fetchCredits:", error);
      }
    };
    
    fetchCredits();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    if (!input.trim() && pendingAttachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }
    
    await sendMessage(input);
    setInput("");
    setPendingAttachments([]);
  };
  
  const switchAgent = (agentId: string) => {
    if (options.onAgentSwitch) {
      options.onAgentSwitch(activeAgent, agentId);
    }
    setActiveAgent(agentId);
    toast.success(`Switched to ${getAgentName(agentId)}`);
  };
  
  const getAgentName = (agentType: string): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      default: return "Assistant";
    }
  };
  
  const clearChat = () => {
    setMessages([]);
    groupIdRef.current = uuidv4();
  };
  
  const addAttachments = (newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  };
  
  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  const updateAgentInstructions = (agentType: string, instructions: string) => {
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    toast.success(`Updated ${getAgentName(agentType)} instructions`);
  };
  
  const getAgentInstructions = (agentType: string): string => {
    return agentInstructions[agentType] || "";
  };
  
  const togglePerformanceMode = () => {
    setUsePerformanceModel(!usePerformanceModel);
    toast.success(`Switched to ${!usePerformanceModel ? "Performance" : "High Quality"} mode`);
  };
  
  const toggleDirectToolExecution = () => {
    setEnableDirectToolExecution(!enableDirectToolExecution);
    toast.success(`${!enableDirectToolExecution ? "Enabled" : "Disabled"} direct tool execution`);
  };
  
  const toggleTracing = () => {
    setTracingEnabled(!tracingEnabled);
    toast.success(`${!tracingEnabled ? "Enabled" : "Disabled"} interaction tracing`);
  };
  
  const handleHandoff = (fromAgentType: string, toAgentType: string, reason: string) => {
    setHandoffInProgress(true);
    setFromAgent(fromAgentType);
    setToAgent(toAgentType);
    
    setTimeout(() => {
      switchAgent(toAgentType);
      setHandoffInProgress(false);
      
      const handoffMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${getAgentName(fromAgentType)} to ${getAgentName(toAgentType)}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff",
        continuityData: {
          fromAgent: fromAgentType,
          toAgent: toAgentType,
          reason: reason,
          timestamp: new Date().toISOString(),
          preserveHistory: true
        }
      };
      
      setMessages(prev => [...prev, handoffMessage]);
    }, 1500);
  };
  
  const sendMessage = async (message: string, agentId?: string) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        setIsLoading(false);
        return;
      }
      
      const runId = uuidv4();
      
      const userMessage: Message = {
        id: uuidv4(),
        content: message,
        role: "user",
        createdAt: new Date().toISOString(),
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      const context: RunnerContext = {
        supabase,
        runId,
        groupId: groupIdRef.current,
        userId: user.id,
        usePerformanceModel,
        enableDirectToolExecution,
        tracingDisabled: !tracingEnabled,
        metadata: {
          conversationHistory: [...messages, userMessage],
          agentInstructions: agentInstructions
        },
        addMessage: (text: string, type: string, attachments?: Attachment[]) => {
          const newMessage: Message = {
            id: uuidv4(),
            content: text,
            role: type === "assistant" ? "assistant" : "system",
            createdAt: new Date().toISOString(),
            type: type,
            attachments: attachments
          };
          setMessages(prev => [...prev, newMessage]);
        },
        toolAvailable: () => true,
        attachments: pendingAttachments
      };
      
      const callbacks: RunnerCallbacks = {
        onMessage: (message: Message) => {
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        },
        onError: (error: string) => {
          toast.error(error);
          const errorMessage: Message = {
            id: uuidv4(),
            content: `Error: ${error}`,
            role: "system",
            createdAt: new Date().toISOString(),
            type: "error",
            status: "error"
          };
          setMessages(prev => [...prev, errorMessage]);
        },
        onHandoffStart: (fromAgentType: string, toAgentType: string, reason: string) => {
          handleHandoff(fromAgentType, toAgentType, reason);
        },
        onHandoffEnd: (agentType: string) => {
        },
        onToolExecution: (toolName: string, params: any) => {
          toast.info(`Executing tool: ${toolName}`);
          console.log(`Tool execution: ${toolName}`, params);
        }
      };
      
      if (!agentRunnerRef.current) {
        agentRunnerRef.current = new AgentRunner(
          agentId || activeAgent, 
          context, 
          callbacks
        );
      } else {
        agentRunnerRef.current = new AgentRunner(
          agentId || activeAgent,
          context,
          callbacks
        );
      }
      
      await agentRunnerRef.current.run(message, pendingAttachments, user.id);
      
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      
      const errorMessage: Message = {
        id: uuidv4(),
        content: error instanceof Error ? error.message : "Failed to send message",
        role: "system",
        createdAt: new Date().toISOString(),
        type: "error",
        status: "error"
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
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
    handoffInProgress,
    agentInstructions,
    fromAgent,
    toAgent,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    updateAgentInstructions,
    getAgentInstructions,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    sendMessage
  };
}
