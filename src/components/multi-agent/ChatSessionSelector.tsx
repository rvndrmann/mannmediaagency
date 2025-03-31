
import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusCircle,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { useChatSession } from '@/contexts/ChatSessionContext';
import { formatDistanceToNow } from 'date-fns';

interface ChatSessionSelectorProps {
  onSelectSession: (sessionId: string) => void;
  currentSessionId: string | null;
}

export function ChatSessionSelector({ onSelectSession, currentSessionId }: ChatSessionSelectorProps) {
  const { 
    chatSessions = [],
    deleteChatSession,
    createChatSession
  } = useChatSession();

  const handleNewSession = () => {
    const newSessionId = createChatSession(null);
    onSelectSession(newSessionId);
  };

  return (
    <div className="w-full p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Conversations</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewSession}
          className="h-8 px-2"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-1">
          {chatSessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">
              No conversations yet
            </div>
          ) : (
            chatSessions
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer ${
                    currentSessionId === session.id ? "bg-accent" : ""
                  }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium">
                        {session.projectId ? `Project ${session.projectId.substring(0, 8)}...` : "General Chat"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChatSession(session.id);
                    }}
                    className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
