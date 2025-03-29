
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

// Type definition for our hook function with additional properties
type ChatSessionHookType = {
  (): ChatSessionContextType;
  getState: () => ChatSessionContextType;
};

// Export the hook with getState capability
export const useChatSession: ChatSessionHookType = (() => {
  // Create the base hook function
  const useHook = () => {
    const context = useContext(ChatSessionContext);
    if (context === undefined) {
      throw new Error("useChatSession must be used within a ChatSessionProvider");
    }
    return context;
  };
  
  // Add the getState static method
  (useHook as any).getState = () => {
    // Access the store state directly
    const store = useChatHistoryStore.getState ? useChatHistoryStore.getState() : useChatHistoryStore();
    return {
      ...store,
      getState: () => store
    };
  };
  
  return useHook as ChatSessionHookType;
})();
