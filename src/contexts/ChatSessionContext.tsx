
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
}

// Define a separate interface for the hook with getState
interface ChatSessionHookType extends Function {
  (): ChatSessionContextType;
  getState: () => ChatSessionContextType;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const chatHistoryStore = useChatHistoryStore();
  
  return (
    <ChatSessionContext.Provider value={chatHistoryStore}>
      {children}
    </ChatSessionContext.Provider>
  );
}

// Export the hook with getState capability
export const useChatSession = (() => {
  // Create the base hook function
  const useHook = () => {
    const context = useContext(ChatSessionContext);
    if (context === undefined) {
      throw new Error("useChatSession must be used within a ChatSessionProvider");
    }
    return context;
  };
  
  // Add the getState static method
  (useHook as ChatSessionHookType).getState = () => {
    // Access the store state directly
    const store = useChatHistoryStore.getState ? useChatHistoryStore.getState() : useChatHistoryStore();
    return store;
  };
  
  return useHook as ChatSessionHookType;
})();
