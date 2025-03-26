
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToolContext, ToolResult, TraceManager } from "./multi-agent/types";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { Message, Command, Task, Attachment, HandoffRequest } from "@/types/message";
import { useAgentRunner } from "./multi-agent/runner/AgentRunner";

export type AgentType = "main" | "creative" | "research" | "code" | "image" | "video" | "browser" | "custom" | string;

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
  const { toast } = useToast();
  const traceManager = new TraceManager();

  // Load custom agents on mount
  useEffect(() => {
    fetchCustomAgents();
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
    handleAgentChange,
    sendMessage,
    addUserMessage,
    fetchCustomAgents,
  };
}
