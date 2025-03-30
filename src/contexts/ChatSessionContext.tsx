
import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from "react";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Enhanced version of setMessages that also updates the store
  const updateMessages = useCallback((newMessages: Message[]) => {
    // Ensure we're always setting an array of messages (not a function)
    setMessages(newMessages);
    
    // Also update the session in the store if we have an active chat ID
    if (chatHistoryStore.activeChatId) {
      chatHistoryStore.updateChatSession(chatHistoryStore.activeChatId, newMessages);
    }
  }, [chatHistoryStore]);
  
  // Enhanced getOrCreateChatSession to make sure messages state is updated
  const getOrCreateSessionWithMessages = useCallback((projectId: string | null) => {
    const sessionId = chatHistoryStore.getOrCreateChatSession(projectId);
    
    // Make sure the active session is set
    chatHistoryStore.setActiveChatId(sessionId);
    
    // Update our local messages state with the session messages
    if (chatHistoryStore.activeSession?.messages) {
      setMessages(chatHistoryStore.activeSession.messages);
    } else {
      setMessages([]);
    }
    
    return sessionId;
  }, [chatHistoryStore]);
  
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
    setMessages: updateMessages,
    isLoading,
    status,
    sendMessage,
    getOrCreateChatSession: getOrCreateSessionWithMessages
  }), [
    chatHistoryStore, 
    messages, 
    updateMessages, 
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
