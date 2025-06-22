
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgentType = 'main' | 'image' | 'tool' | 'scene';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  agentType?: AgentType;
  agentName?: string;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  openai_thread_id?: string;
}

export const useMultiAgentChat = () => {
  const { projectId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentType>('main');
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize chat session
  useEffect(() => {
    if (projectId && !isInitialized) {
      initializeChatSession();
    }
  }, [projectId, isInitialized]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const initializeChatSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) return;

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (existingSession) {
        setChatSession(existingSession);
        await loadMessages(existingSession.id);
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('chat_sessions')
          .insert({
            project_id: projectId,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        setChatSession(newSession);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing chat session:', error);
      toast.error('Failed to initialize chat session');
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        agentName: msg.sender_name || undefined
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const sendMessage = useCallback(async (messageContent?: string) => {
    const content = messageContent || input;
    if (!content.trim() || !chatSession || !projectId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: 'user',
          content: content.trim(),
          thread_id: chatSession.id
        });

      // Simulate AI response (replace with actual AI integration)
      const aiResponse = await simulateAIResponse(content, currentAgent);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        agentType: currentAgent,
        agentName: getAgentName(currentAgent)
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: 'assistant',
          content: aiResponse,
          thread_id: chatSession.id,
          sender_name: getAgentName(currentAgent)
        });

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [input, chatSession, projectId, currentAgent]);

  const simulateAIResponse = async (userMessage: string, agent: AgentType): Promise<string> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responses = {
      main: `As the main agent, I understand you want to: "${userMessage}". Let me help coordinate this task.`,
      image: `As the image specialist, I can help with visual content related to: "${userMessage}".`,
      tool: `As the tool agent, I can execute specific actions for: "${userMessage}".`,
      scene: `As the scene agent, I can help structure and organize content for: "${userMessage}".`
    };
    
    return responses[agent] || "I'm here to help with your request.";
  };

  const getAgentName = (agent: AgentType): string => {
    const names = {
      main: 'Main Agent',
      image: 'Image Agent', 
      tool: 'Tool Agent',
      scene: 'Scene Agent'
    };
    return names[agent];
  };

  const switchAgent = useCallback((newAgent: AgentType) => {
    setCurrentAgent(newAgent);
    toast.info(`Switched to ${getAgentName(newAgent)}`);
  }, []);

  const clearChat = useCallback(async () => {
    if (!projectId) return;
    
    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('project_id', projectId);
      
      setMessages([]);
      toast.success('Chat cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  }, [projectId]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    currentAgent,
    sendMessage,
    switchAgent,
    clearChat,
    messagesEndRef,
    isInitialized,
    chatSession
  };
};
