
import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect } from "react";
import { useChatHistoryStore, ChatSession } from "@/hooks/use-chat-history-store";
import { Message } from "@/types/message";

export interface ChatSessionContextType {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  activeSession: ChatSession | null;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  isLoading: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  sendMessage: (params: { content: string; context?: any }) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  createChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  getOrCreateChatSession: (projectId: string | null) => string;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  deleteChatSession: (sessionId: string) => void;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const chatHistoryStore = useChatHistoryStore();
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncedWithStore, setSyncedWithStore] = useState(false);
  
  // Sync local state with store when active session changes - safely handle this to prevent loops
  useEffect(() => {
    const activeSessionMessages = chatHistoryStore.activeSession?.messages;
    
    // Only update if there's a meaningful change to prevent unnecessary rerenders
    if (activeSessionMessages && !syncedWithStore) {
      setMessagesState(activeSessionMessages);
      setSyncedWithStore(true);
    } else if (!activeSessionMessages && syncedWithStore) {
      setMessagesState([]);
      setSyncedWithStore(false);
    }
  }, [chatHistoryStore.activeSession, syncedWithStore]);
  
  // Enhanced version of setMessages that also updates the store
  const setMessages = useCallback((newMessages: Message[]) => {
    setMessagesState(newMessages);
    
    // Also update the session in the store if we have an active chat ID
    if (chatHistoryStore.activeChatId) {
      chatHistoryStore.updateChatSession(chatHistoryStore.activeChatId, newMessages);
    }
  }, [chatHistoryStore]);
  
  // Enhanced getOrCreateChatSession to make sure messages state is updated - avoid infinite loops
  const getOrCreateSessionWithMessages = useCallback((projectId: string | null) => {
    const sessionId = chatHistoryStore.getOrCreateChatSession(projectId);
    
    // Make sure the active session is set
    chatHistoryStore.setActiveChatId(sessionId);
    
    // Find the session and set its messages to our local state
    const session = chatHistoryStore.chatSessions.find(s => s.id === sessionId);
    if (session?.messages && !syncedWithStore) {
      setMessagesState(session.messages);
      setSyncedWithStore(true);
    }
    
    return sessionId;
  }, [chatHistoryStore, syncedWithStore]);
  
  const sendMessage = useCallback(async (params: { content: string; context?: any }) => {
    try {
      setStatus('loading');
      // This is just a placeholder - actual sending happens in the component
      setStatus('success');
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus('error');
      throw error;
    }
  }, []);
  
  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(() => ({
    ...chatHistoryStore,
    messages,
    setMessages,
    isLoading,
    status,
    sendMessage,
    getOrCreateChatSession: getOrCreateSessionWithMessages
  }), [
    chatHistoryStore, 
    messages, 
    setMessages, 
    isLoading, 
    status, 
    sendMessage, 
    getOrCreateSessionWithMessages
  ]);
  
  return (
    <ChatSessionContext.Provider value={contextValue}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  const context = useContext(ChatSessionContext);
  if (context === undefined) {
    throw new Error("useChatSession must be used within a ChatSessionProvider");
  }
  return context;
}
