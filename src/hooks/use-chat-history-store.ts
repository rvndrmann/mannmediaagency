
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Message } from "@/types/message";

export interface ChatSession {
  id: string;
  projectId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatHistoryState {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  activeSession: ChatSession | null;
  setActiveChatId: (id: string | null) => void;
  createChatSession: (projectId: string | null, initialMessages?: Message[]) => string;
  getOrCreateChatSession: (projectId: string | null) => string;
  updateChatSession: (sessionId: string, messages: Message[]) => void;
  deleteChatSession: (sessionId: string) => void;
}

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set, get) => ({
      chatSessions: [],
      activeChatId: null,
      activeSession: null,
      
      setActiveChatId: (id) => {
        set((state) => {
          const activeSession = id 
            ? state.chatSessions.find(session => session.id === id) || null
            : null;
          
          return { 
            activeChatId: id,
            activeSession
          };
        });
      },
      
      createChatSession: (projectId, initialMessages = []) => {
        const newSessionId = crypto.randomUUID();
        const currentTime = new Date().toISOString();
        
        const newSession: ChatSession = {
          id: newSessionId,
          projectId,
          name: projectId ? `Project #${projectId}` : `Chat ${new Date().toLocaleString()}`,
          createdAt: currentTime,
          updatedAt: currentTime,
          messages: initialMessages,
        };
        
        set((state) => {
          const updatedSessions = [...state.chatSessions, newSession];
          return { 
            chatSessions: updatedSessions,
            activeChatId: newSessionId,
            activeSession: newSession
          };
        });
        
        return newSessionId;
      },
      
      getOrCreateChatSession: (projectId) => {
        const { chatSessions, createChatSession, setActiveChatId } = get();
        
        // Try to find an existing session for this project
        if (projectId) {
          const existingSession = chatSessions.find(session => session.projectId === projectId);
          if (existingSession) {
            setActiveChatId(existingSession.id);
            return existingSession.id;
          }
        }
        
        // Create a new session if none exists
        return createChatSession(projectId);
      },
      
      updateChatSession: (sessionId, messages) => {
        set((state) => {
          const updatedSessions = state.chatSessions.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages,
                updatedAt: new Date().toISOString()
              };
            }
            return session;
          });
          
          // Also update activeSession if that's the one being modified
          const activeSession = sessionId === state.activeChatId
            ? updatedSessions.find(s => s.id === sessionId) || state.activeSession
            : state.activeSession;
          
          return { 
            chatSessions: updatedSessions,
            activeSession
          };
        });
      },
      
      deleteChatSession: (sessionId) => {
        set((state) => {
          const updatedSessions = state.chatSessions.filter(
            session => session.id !== sessionId
          );
          
          // If the active session was deleted, set active to null
          const newActiveChatId = state.activeChatId === sessionId ? null : state.activeChatId;
          const newActiveSession = newActiveChatId 
            ? updatedSessions.find(s => s.id === newActiveChatId) || null
            : null;
          
          return { 
            chatSessions: updatedSessions,
            activeChatId: newActiveChatId,
            activeSession: newActiveSession
          };
        });
      }
    }),
    {
      name: "chat-history"
    }
  )
);
