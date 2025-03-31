
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';

interface ChatSession {
  id: string;
  projectId: string | null;
  messages: Message[];
  updatedAt: string;
}

interface ChatSessionContextType {
  sessions: Record<string, ChatSession>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  getOrCreateChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  deleteSession: (sessionId: string) => void;
}

const ChatSessionContext = createContext<ChatSessionContextType>({
  sessions: {},
  activeChatId: null,
  setActiveChatId: () => {},
  updateChatSession: () => {},
  getOrCreateChatSession: () => "",
  deleteSession: () => {}
});

export const useChatSession = () => useContext(ChatSessionContext);

export const ChatSessionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Load user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    
    getUserId();
  }, []);
  
  // Load sessions from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const savedSessions = localStorage.getItem(`chat_sessions_${userId}`);
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
      
      const lastActiveSession = localStorage.getItem(`active_chat_session_${userId}`);
      if (lastActiveSession) {
        setActiveChatId(lastActiveSession);
      }
    } catch (e) {
      console.error('Error loading chat sessions from localStorage', e);
    }
  }, [userId]);
  
  // Save sessions to localStorage when they change
  useEffect(() => {
    if (!userId) return;
    
    try {
      localStorage.setItem(`chat_sessions_${userId}`, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error saving chat sessions to localStorage', e);
    }
  }, [sessions, userId]);
  
  // Save active session ID to localStorage when it changes
  useEffect(() => {
    if (!userId) return;
    
    try {
      if (activeChatId) {
        localStorage.setItem(`active_chat_session_${userId}`, activeChatId);
      } else {
        localStorage.removeItem(`active_chat_session_${userId}`);
      }
    } catch (e) {
      console.error('Error saving active chat session to localStorage', e);
    }
  }, [activeChatId, userId]);
  
  const updateChatSession = (sessionId: string, messages: Message[]) => {
    setSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        messages,
        updatedAt: new Date().toISOString()
      }
    }));
  };
  
  const getOrCreateChatSession = (projectId: string | null, initialMessages: Message[] = []) => {
    // Look for an existing session for this project
    const existingSessionId = Object.entries(sessions).find(
      ([_, session]) => session.projectId === projectId
    )?.[0];
    
    if (existingSessionId) {
      setActiveChatId(existingSessionId);
      return existingSessionId;
    }
    
    // Create a new session
    const newSessionId = uuidv4();
    
    setSessions(prev => ({
      ...prev,
      [newSessionId]: {
        id: newSessionId,
        projectId,
        messages: initialMessages,
        updatedAt: new Date().toISOString()
      }
    }));
    
    setActiveChatId(newSessionId);
    return newSessionId;
  };
  
  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = { ...prev };
      delete newSessions[sessionId];
      return newSessions;
    });
    
    if (activeChatId === sessionId) {
      setActiveChatId(null);
    }
  };
  
  return (
    <ChatSessionContext.Provider
      value={{
        sessions,
        activeChatId,
        setActiveChatId,
        updateChatSession,
        getOrCreateChatSession,
        deleteSession
      }}
    >
      {children}
    </ChatSessionContext.Provider>
  );
};
