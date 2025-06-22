
import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, Attachment } from '@/types/message';
import { toast } from 'sonner';

export type AgentType = 'script_writer' | 'image_generator' | 'video_creator' | 'orchestrator' | 'generic' | 'main' | 'script' | 'image' | 'tool' | 'scene' | 'data';

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  instructions: string;
  type: AgentType;
  isBuiltIn: boolean;
}

interface UseMultiAgentChatOptions {
  projectId?: string;
  sceneId?: string;
  useAssistantsApi?: boolean;
  useMcp?: boolean;
  initialMessages?: Message[];
}

export const useMultiAgentChat = (options: UseMultiAgentChatOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>('generic');
  const [isMcpEnabled, setIsMcpEnabled] = useState(options.useMcp || false);
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [input, setInput] = useState('');
  const [userCredits, setUserCredits] = useState<any>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [tracingEnabled, setTracingEnabled] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'createdAt'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const addUserMessage = useCallback((content: string) => {
    return addMessage({
      role: 'user',
      content,
      projectId: options.projectId,
      sceneId: options.sceneId,
    });
  }, [addMessage, options.projectId, options.sceneId]);

  const addAgentMessage = useCallback((agentType: string, content: string, sceneId?: string) => {
    return addMessage({
      role: 'assistant',
      content,
      agentType,
      projectId: options.projectId,
      sceneId: sceneId || options.sceneId,
    });
  }, [addMessage, options.projectId, options.sceneId]);

  const addSystemMessage = useCallback((content: string) => {
    return addMessage({
      role: 'system',
      content,
      projectId: options.projectId,
      sceneId: options.sceneId,
    });
  }, [addMessage, options.projectId, options.sceneId]);

  const toggleMcp = useCallback(() => {
    setIsMcpEnabled(prev => !prev);
  }, []);

  const toggleTracing = useCallback(() => {
    setTracingEnabled(prev => !prev);
  }, []);

  const handleSubmit = useCallback(async (content?: string) => {
    const messageContent = content || input;
    if (!messageContent.trim() && pendingAttachments.length === 0) return;
    
    await sendMessage(messageContent);
    setInput('');
    setPendingAttachments([]);
  }, [input, pendingAttachments]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    agentType: AgentType = 'generic'
  ) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Add user message
      addUserMessage(content);

      // Simulate agent response
      setTimeout(() => {
        addAgentMessage(agentType, `Response from ${agentType} agent: ${content}`);
        setIsLoading(false);
      }, 1000);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setIsLoading(false);
    }
  }, [isLoading, addUserMessage, addAgentMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    activeAgent,
    isMcpEnabled,
    isMcpConnected,
    input,
    setInput,
    setMessages,
    setActiveAgent,
    addMessage,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    sendMessage,
    clearMessages,
    stopGeneration,
    toggleMcp,
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    tracingEnabled,
    handleSubmit,
    clearChat,
    toggleTracing,
    addAttachments,
    removeAttachment,
  };
};
