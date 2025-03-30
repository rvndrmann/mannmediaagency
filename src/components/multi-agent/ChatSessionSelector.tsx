
import React from "react";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatSessionSelectorProps {
  onCreateNew?: () => void;
  maxDisplayed?: number;
}

export function ChatSessionSelector({ 
  onCreateNew,
  maxDisplayed = 5
}: ChatSessionSelectorProps) {
  const { 
    chatSessions,
    activeChatId,
    setActiveChatId,
    deleteChatSession,
    createChatSession
  } = useChatSession();

  // Sort sessions by updatedAt, most recent first
  const sortedSessions = [...chatSessions].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, maxDisplayed);

  // Handle creating a new chat
  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      createChatSession(null);
    }
  };

  // For empty state
  if (chatSessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 px-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCreateNew}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Start New Chat</span>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tabs 
          value={activeChatId || undefined} 
          onValueChange={(value) => setActiveChatId(value)}
          className="w-full"
        >
          <ScrollArea className="w-full px-1 max-w-[600px]">
            <TabsList className="flex w-full h-10 overflow-x-auto">
              {sortedSessions.map(session => (
                <div key={session.id} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value={session.id}
                        className="relative px-3 py-1 flex-shrink-0 max-w-[180px] truncate"
                      >
                        {session.name}
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{session.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated {formatDistanceToNow(new Date(session.updatedAt))} ago
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.messages.length} messages
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {session.id === activeChatId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </TabsList>
          </ScrollArea>
        </Tabs>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleCreateNew}
          className="flex-shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
