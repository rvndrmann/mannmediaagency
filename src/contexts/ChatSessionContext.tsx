import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Message } from "@/types/message";

interface ChatSession {
  id: string;
  projectId: string | null;
  title: string;
  createdAt: string;
  lastUpdatedAt: string;
  lastUpdated?: string; // Added for compatibility
  messages: Message[];
}

interface ChatSessionContextType {
  sessions: ChatSession[];
  activeChatId: string | null;
  activeSession: ChatSession | null;
  setActiveChatId: (id: string) => void;
  getOrCreateChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  deleteChatSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  createChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  chatSessions: ChatSession[]; // Alias for sessions to maintain compatibility
}

const defaultContext: ChatSessionContextType = {
  sessions: [],
  chatSessions: [], // Add chatSessions as alias
  activeChatId: null,
  activeSession: null,
  setActiveChatId: () => {},
  getOrCreateChatSession: () => "",
  updateChatSession: () => {},
  deleteChatSession: () => {},
  renameSession: () => {},
  createChatSession: () => ""
};

const ChatSessionContext = createContext<ChatSessionContextType>(defaultContext);

// Session storage key
const STORAGE_KEY = "chat_sessions";
const ACTIVE_SESSION_KEY = "active_chat_session";

export const ChatSessionProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Load sessions from storage on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
      
      const savedActiveSession = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (savedActiveSession) {
        setActiveChatId(savedActiveSession);
      }
    } catch (error) {
      console.error("Error loading chat sessions from localStorage:", error);
    }
  }, []);
  
  // Save sessions to storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Error saving chat sessions to localStorage:", error);
    }
  }, [sessions]);
  
  // Save active session ID whenever it changes
  useEffect(() => {
    try {
      if (activeChatId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, activeChatId);
      }
    } catch (error) {
      console.error("Error saving active chat session to localStorage:", error);
    }
  }, [activeChatId]);
  
  // Get the active session object
  const activeSession = activeChatId 
    ? sessions.find(session => session.id === activeChatId) || null
    : null;
  
  // Create a new chat session (added for compatibility)
  const createChatSession = useCallback((projectId: string | null, initialMessages: Message[] = []): string => {
    const newSessionId = uuidv4();
    const now = new Date().toISOString();
    
    const newSession: ChatSession = {
      id: newSessionId,
      projectId,
      title: projectId ? `Project ${projectId.substring(0, 8)}` : `Chat ${new Date().toLocaleString()}`,
      createdAt: now,
      lastUpdatedAt: now,
      messages: initialMessages
    };
    
    setSessions(prev => [...prev, newSession]);
    setActiveChatId(newSessionId);
    
    return newSessionId;
  }, []);
  
  // Get or create a chat session for a project
  const getOrCreateChatSession = useCallback((projectId: string | null, initialMessages: Message[] = []): string => {
    // First, try to find an existing session for this project
    if (projectId) {
      const existingSession = sessions.find(session => session.projectId === projectId);
      if (existingSession) {
        setActiveChatId(existingSession.id);
        return existingSession.id;
      }
    }
    
    // Create a new session
    return createChatSession(projectId, initialMessages);
  }, [sessions, createChatSession]);
  
  // Update a chat session's messages
  const updateChatSession = useCallback((sessionId: string, messages: Message[]) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? {
            ...session,
            messages,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString() // Add compatibility alias
          }
        : session
    ));
  }, []);
  
  // Delete a chat session
  const deleteChatSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    
    // If we're deleting the active session, set active to null
    if (activeChatId === sessionId) {
      setActiveChatId(null);
    }
  }, [activeChatId]);
  
  // Rename a session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? {
            ...session,
            title: newTitle
          }
        : session
    ));
  }, []);
  
  const contextValue: ChatSessionContextType = {
    sessions,
    chatSessions: sessions, // Add chatSessions as alias
    activeChatId,
    activeSession,
    setActiveChatId,
    getOrCreateChatSession,
    updateChatSession,
    deleteChatSession,
    renameSession,
    createChatSession
  };
  
  return (
    <ChatSessionContext.Provider value={contextValue}>
      {children}
    </ChatSessionContext.Provider>
  );
};

export const useChatSession = () => useContext(ChatSessionContext);
