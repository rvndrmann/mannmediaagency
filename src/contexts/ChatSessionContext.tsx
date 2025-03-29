
import React, { createContext, useContext, ReactNode } from "react";
import { useChatHistoryStore, ChatSession, ChatHistoryStore } from "@/hooks/use-chat-history-store";
import { Message } from "@/types/message";

// Define a separate interface for the hook with getState
interface ChatSessionHookType extends Function {
  (): ChatHistoryStore;
  getState: () => ChatHistoryStore;
}

// Ensure default values are provided for the store
const defaultStoreValues: ChatHistoryStore = {
  chatSessions: [],
  activeChatId: null,
  activeSession: null,
  syncing: false,
  setActiveChatId: () => {},
  createChatSession: () => "",
  getOrCreateChatSession: () => "",
  updateChatSession: () => {},
  deleteChatSession: () => {}
};

const ChatSessionContext = createContext<ChatHistoryStore>(defaultStoreValues);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const chatHistoryStore = useChatHistoryStore();
  
  return (
    <ChatSessionContext.Provider value={chatHistoryStore}>
      {children}
    </ChatSessionContext.Provider>
  );
}

// Create the base hook function
const useHookBase = (): ChatHistoryStore => {
  const context = useContext(ChatSessionContext);
  if (context === undefined) {
    console.warn("useChatSession used outside of ChatSessionProvider, returning default values");
    return defaultStoreValues;
  }
  return context;
};

// Cast the hook function to include the getState method
export const useChatSession = useHookBase as ChatSessionHookType;

// Add getState method to the hook
useChatSession.getState = (): ChatHistoryStore => {
  // Access the store state directly using the getState method from useChatHistoryStore
  try {
    return useChatHistoryStore.getState();
  } catch (error) {
    console.warn("Error accessing chat history store state:", error);
    return defaultStoreValues;
  }
};
