
import { useState, useEffect } from "react";
import { Message } from "@/types/message";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { supabase } from "@/integrations/supabase/client";

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
      messages: initialMessages
    };
    
    setChatSessions([...chatSessions, newSession]);
    setActiveChatId(newSessionId);
    return newSessionId;
  };
  
  // Get or create chat session for a project
  const getOrCreateChatSession = (projectId: string | null, initialMessages: Message[] = []) => {
    // First, check for an existing session with this project ID
    const existingSession = chatSessions.find(session => session.projectId === projectId);
    
    if (existingSession) {
      setActiveChatId(existingSession.id);
      
      // If there are initial messages and the existing session has no messages,
      // update the session with the initial messages
      if (initialMessages.length > 0 && existingSession.messages.length === 0) {
        updateChatSession(existingSession.id, initialMessages);
      }
      
      return existingSession.id;
    }
    
    return createChatSession(projectId, initialMessages);
  };
  
  // Update messages in a chat session
  const updateChatSession = (sessionId: string, messages: Message[]) => {
    setChatSessions(
      chatSessions.map(session => 
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
    const updatedSessions = chatSessions.filter(session => session.id !== sessionId);
    setChatSessions(updatedSessions);
    
    // If we deleted the active session, set a new active session
    if (activeChatId === sessionId) {
      setActiveChatId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
    }
  };
  
  // Sync with Supabase if user is logged in
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setSyncing(true);
        
        // Future implementation: sync with Supabase
        // For now, we'll just use local storage
        
        setSyncing(false);
      } catch (error) {
        console.error("Error syncing chat sessions:", error);
        setSyncing(false);
      }
    };
    
    syncWithServer();
  }, []);
  
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
