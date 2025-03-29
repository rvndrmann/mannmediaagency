
import { useState, useEffect } from "react";
import { Message } from "@/types/message";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/utils/toast-utils";

// Type for chat session data
export interface ChatSession {
  id: string;
  projectId: string | null;
  title: string;
  lastUpdated: string;
  messages: Message[];
}

export function useChatHistoryStore() {
  // Use local storage for chat sessions
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>("chat-sessions", []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>("active-chat-id", null);
  const [syncing, setSyncing] = useState(false);

  // Get active chat session
  const activeSession = chatSessions.find(session => session.id === activeChatId) || null;
  
  // Create a new chat session
  const createChatSession = (projectId: string | null = null, initialMessages: Message[] = []) => {
    const newSessionId = crypto.randomUUID();
    const title = projectId ? `Project #${projectId}` : `Chat ${chatSessions.length + 1}`;
    
    // Check if we already have a session with this same projectId
    const existingSession = projectId 
      ? chatSessions.find(session => session.projectId === projectId)
      : null;
    
    if (existingSession) {
      // If we have an existing session, just reuse it
      setActiveChatId(existingSession.id);
      return existingSession.id;
    }
    
    const newSession: ChatSession = {
      id: newSessionId,
      projectId,
      title,
      lastUpdated: new Date().toISOString(),
      messages: initialMessages,
    };
    
    setChatSessions(prev => [...prev, newSession]);
    setActiveChatId(newSessionId);
    
    return newSessionId;
  };
  
  // Get or create a chat session for a project
  const getOrCreateChatSession = (projectId: string | null, initialMessages: Message[] = []) => {
    // First check if we already have a session for this project
    if (projectId) {
      const existingSession = chatSessions.find(session => session.projectId === projectId);
      if (existingSession) {
        setActiveChatId(existingSession.id);
        return existingSession.id;
      }
    }
    
    // If not, create a new one
    return createChatSession(projectId, initialMessages);
  };
  
  // Update a chat session
  const updateChatSession = (sessionId: string, messages: Message[]) => {
    if (!sessionId) {
      console.error("No session ID provided for update");
      return;
    }
    
    setChatSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              messages, 
              lastUpdated: new Date().toISOString() 
            } 
          : session
      )
    );
  };
  
  // Delete a chat session
  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    
    // If the deleted session was active, set activeChatId to null
    if (activeChatId === sessionId) {
      setActiveChatId(null);
    }
  };
  
  return {
    chatSessions,
    activeChatId,
    activeSession,
    setActiveChatId,
    createChatSession,
    getOrCreateChatSession,
    updateChatSession,
    deleteChatSession,
    syncing
  };
}
