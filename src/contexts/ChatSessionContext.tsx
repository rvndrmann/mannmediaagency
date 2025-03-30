
import React, { createContext, useContext, ReactNode, useState } from "react";
import { useChatHistoryStore, ChatSession } from "@/hooks/use-chat-history-store";
import { Message } from "@/types/message";

export interface ChatSessionContextType {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  activeSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  sendMessage: (params: { content: string; context?: any }) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  createChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  getOrCreateChatSession: (projectId: string | null, type?: string | Message[]) => string;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  deleteChatSession: (sessionId: string) => void;
  syncing: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const chatHistoryStore = useChatHistoryStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const sendMessage = async (params: { content: string; context?: any }) => {
    try {
      setStatus('loading');
      // Implementation would go here in a real app
      // For now, we'll just push a mock message
      const newMessage: Message = {
        id: crypto.randomUUID(),
        content: params.content,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      const responseMessage: Message = {
        id: crypto.randomUUID(),
        content: `Response to: ${params.content}`,
        role: 'assistant',
        createdAt: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, newMessage, responseMessage];
      setMessages(updatedMessages);
      
      if (chatHistoryStore.activeSession) {
        chatHistoryStore.updateChatSession(
          chatHistoryStore.activeSession.id,
          updatedMessages
        );
      }
      
      setStatus('success');
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus('error');
      throw error;
    }
  };
  
  // Enhanced getOrCreateChatSession to support type as string or initial messages
  const getOrCreateChatSession = (projectId: string | null, typeOrMessages: string | Message[] = 'default') => {
    let initialMessages: Message[] | undefined;
    let type = 'default';
    
    // Check if the second parameter is a string (type) or array (messages)
    if (Array.isArray(typeOrMessages)) {
      initialMessages = typeOrMessages;
    } else {
      type = typeOrMessages;
    }
    
    const sessionId = chatHistoryStore.getOrCreateChatSession(projectId, initialMessages);
    
    // If we have messages in the session, use those
    if (chatHistoryStore.activeSession?.messages) {
      setMessages(chatHistoryStore.activeSession.messages);
    } else {
      setMessages(initialMessages || []);
    }
    
    return sessionId;
  };
  
  return (
    <ChatSessionContext.Provider value={{
      ...chatHistoryStore,
      messages,
      isLoading,
      status,
      sendMessage,
      getOrCreateChatSession
    }}>
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
