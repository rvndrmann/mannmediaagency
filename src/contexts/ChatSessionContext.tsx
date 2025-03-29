
import React, { createContext, useContext, ReactNode } from "react";
import { useChatHistoryStore, ChatSession } from "@/hooks/use-chat-history-store";
import { Message } from "@/types/message";

interface ChatSessionContextType {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  activeSession: ChatSession | null;
  setActiveChatId: (id: string | null) => void;
  createChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  getOrCreateChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  deleteChatSession: (sessionId: string) => void;
  syncing: boolean;
  getState?: () => ChatSessionContextType; // Add this method for compatibility
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const chatHistoryStore = useChatHistoryStore();
  
  // Add getState method to the store
  const enhancedStore: ChatSessionContextType = {
    ...chatHistoryStore,
    getState: () => enhancedStore
  };
  
  return (
    <ChatSessionContext.Provider value={enhancedStore}>
      {children}
    </ChatSessionContext.Provider>
  );
}

// Create a type for the hook with getState
interface ChatSessionHook extends (() => ChatSessionContextType) {
  getState: () => ChatSessionContextType;
}

// Expose getState on the hook for compatibility
export const useChatSession = (() => {
  const useHook = () => {
    const context = useContext(ChatSessionContext);
    if (context === undefined) {
      throw new Error("useChatSession must be used within a ChatSessionProvider");
    }
    return context;
  };
  
  // Add a getState static method
  (useHook as ChatSessionHook).getState = () => {
    const store = useChatHistoryStore.getState();
    return {
      ...store,
      getState: () => store
    };
  };
  
  return useHook as ChatSessionHook;
})();
