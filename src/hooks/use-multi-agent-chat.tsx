
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToolContext, ToolResult, TraceManager } from "./multi-agent/types";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { Message, Command, Task, Attachment, HandoffRequest } from "@/types/message";
import { useAgentRunner } from "./multi-agent/runner/AgentRunner";

export type AgentType = "main" | "creative" | "research" | "code" | "image" | "video" | "browser" | "custom" | string;

// Add the BUILT_IN_AGENT_TYPES array that's exported
export const BUILT_IN_AGENT_TYPES = ["main", "creative", "research", "code", "image", "video", "browser", "tool", "scene"];

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
  const [input, setInput] = useState(""); 
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]); 
  const [usePerformanceModel, setUsePerformanceModel] = useState(false); 
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState(false); 
  const [tracingEnabled, setTracingEnabled] = useState(false); 
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null); 
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null); 
  
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

  const addAssistantMessage = useCallback((content: string, agentType: AgentType = currentAgentType) => {
    const newMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      agentType,
      agentName: agentType === 'main' ? 'Main Agent' : agentType.charAt(0).toUpperCase() + agentType.slice(1),
      agentIcon: 'Bot',
      modelUsed: usePerformanceModel ? 'gpt-4o-mini' : 'gpt-4o',
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, [currentAgentType, usePerformanceModel]);

  // Function for switching between agents
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
      
      // Start trace if enabled
      if (tracingEnabled) {
        const newTraceId = uuidv4();
        setTraceId(newTraceId);
        traceManager.startTrace(newTraceId, {
          agentType: currentAgentType,
          conversationId: currentConversationId,
          userMessage: content,
          hasAttachments: attachments.length > 0,
        });
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add placeholder response
      const responseMsg = addAssistantMessage(
        `This is a response from the ${currentAgentType} agent. I'm using the ${usePerformanceModel ? 'fast GPT-4o-mini' : 'powerful GPT-4o'} model.
        
You asked: "${content}"
        
Here's what I can do:
- Answer questions and provide information
- Help with creative writing and ideation
- Generate code and explain technical concepts
- Create prompts for image generation
- Assist with browser automation tasks
        
${attachments.length > 0 ? `I see you've attached ${attachments.length} file(s). In a real implementation, I would process these attachments.` : ''}
        
If you want to try different agent types, select one from the options above!`
      );
      
      // Complete the trace if enabled
      if (tracingEnabled && traceId) {
        traceManager.addEvent(traceId, 'response', {
          agentType: currentAgentType,
          content: responseMsg.content,
          model: usePerformanceModel ? 'gpt-4o-mini' : 'gpt-4o',
        });
        traceManager.completeTrace(traceId);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      setCurrentError(errorMsg);
      
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      
      if (tracingEnabled && traceId) {
        traceManager.addEvent(traceId, 'error', { error: errorMsg });
        traceManager.completeTrace(traceId);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [addUserMessage, addAssistantMessage, currentAgentType, usePerformanceModel, tracingEnabled, currentConversationId, traceId, toast]);

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
    addAssistantMessage,
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
