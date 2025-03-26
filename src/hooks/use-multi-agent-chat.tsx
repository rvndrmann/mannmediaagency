
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToolContext, ToolResult, TraceManager } from "./multi-agent/types";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { Message, Command, Task, Attachment, HandoffRequest } from "@/types/message";
import { useAgentRunner } from "./multi-agent/runner/AgentRunner";

export type AgentType = "main" | "creative" | "research" | "code" | "image" | "video" | "browser" | "custom" | string;

// Add the missing BUILT_IN_AGENT_TYPES array
export const BUILT_IN_AGENT_TYPES = ["main", "script", "image", "tool", "scene"];

export interface Environment {
  userId: string;
  sessionId: string;
  attachments: Attachment[];
  credits: number;
}

export interface CustomAgentInfo {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  color: string;
}

export function useMultiAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAgentType, setCurrentAgentType] = useState<AgentType>("main");
  const [isCustomAgent, setIsCustomAgent] = useState(false);
  const [customAgents, setCustomAgents] = useState<CustomAgentInfo[]>([]);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [input, setInput] = useState(""); // Add missing state for input
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]); // Add missing state for attachments
  const [usePerformanceModel, setUsePerformanceModel] = useState(false); // Add missing state for performance model toggle
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState(false); // Add missing state for direct tool execution
  const [tracingEnabled, setTracingEnabled] = useState(false); // Add missing state for tracing
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null); // Add missing state for conversation ID
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null); // Add missing state for user credits
  
  const { toast } = useToast();
  const traceManager = new TraceManager();

  // Load custom agents on mount
  useEffect(() => {
    fetchCustomAgents();
    // Initialize conversation ID
    setCurrentConversationId(uuidv4());
    // Load user credits (mock implementation)
    setUserCredits({ credits_remaining: 50 });
  }, []);

  const fetchCustomAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_agents')
        .select('id, name, description, instructions, icon, color');
      
      if (error) throw error;

      if (data) {
        setCustomAgents(data as CustomAgentInfo[]);
      }
    } catch (error) {
      console.error('Error fetching custom agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom agents.',
        variant: 'destructive',
      });
    }
  };

  const handleAgentChange = useCallback((agentType: AgentType, isCustom: boolean = false) => {
    setCurrentAgentType(agentType);
    setIsCustomAgent(isCustom);
  }, []);

  const addUserMessage = useCallback((content: string, attachments?: Attachment[]) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      attachments: attachments || [],
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Add missing functions that are being used in MultiAgentChat component
  const switchAgent = useCallback((agentType: AgentType) => {
    handleAgentChange(agentType, customAgents.some(a => a.id === agentType));
  }, [customAgents, handleAgentChange]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setPendingAttachments([]);
    setCurrentConversationId(uuidv4());
  }, []);

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const togglePerformanceMode = useCallback(() => {
    setUsePerformanceModel(prev => !prev);
  }, []);

  const toggleDirectToolExecution = useCallback(() => {
    setEnableDirectToolExecution(prev => !prev);
  }, []);

  const toggleTracing = useCallback(() => {
    setTracingEnabled(prev => !prev);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && pendingAttachments.length === 0) return;

    const content = input;
    const attachments = [...pendingAttachments];
    
    // Reset input and attachments
    setInput("");
    setPendingAttachments([]);
    
    // Send the message
    sendMessage(content, attachments);
  }, [input, pendingAttachments]);

  // This is a simplified placeholder for the actual implementation
  const sendMessage = useCallback(async (
    content: string, 
    attachments: Attachment[] = [],
    environment?: Environment
  ) => {
    setIsProcessing(true);
    setCurrentError(null);
    
    try {
      // Add user message
      addUserMessage(content, attachments);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add placeholder response
      const responseMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `This is a placeholder response from the ${currentAgentType} agent. The actual agent implementation will be added in a future update.`,
        createdAt: new Date().toISOString(),
        agentType: currentAgentType,
        agentName: currentAgentType === 'main' ? 'Main Agent' : currentAgentType.charAt(0).toUpperCase() + currentAgentType.slice(1),
        agentIcon: 'Bot',
        modelUsed: 'gpt-4',
      };
      
      setMessages(prev => [...prev, responseMsg]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      setCurrentError(errorMsg);
      
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [addUserMessage, currentAgentType, toast]);

  return {
    messages,
    isProcessing,
    currentAgentType,
    isCustomAgent,
    customAgents,
    traceId,
    currentError,
    input,
    setInput,
    isLoading: isProcessing, // Alias for isProcessing for compatibility
    activeAgent: currentAgentType, // Alias for currentAgentType for compatibility
    userCredits,
    pendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    currentConversationId,
    handleAgentChange,
    sendMessage,
    addUserMessage,
    fetchCustomAgents,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing
  };
}
