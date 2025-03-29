
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { X } from "lucide-react";

export interface ChatSessionSelectorProps {
  onSelectSession: (id: string) => void;
  onClose: () => void;
}

export function ChatSessionSelector({ onSelectSession, onClose }: ChatSessionSelectorProps) {
  const { chatSessions = [], activeChatId } = useChatSession();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    handleClose();
  };

  // Sort sessions by lastUpdated date descending
  // Ensure chatSessions is an array before trying to sort or access it
  const sortedSessions = Array.isArray(chatSessions) 
    ? [...chatSessions].sort((a, b) => {
        return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
      })
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>Chat History</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {sortedSessions.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No chat sessions found
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((session) => (
                <Button
                  key={session.id}
                  variant={session.id === activeChatId ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {session.title || "Chat session"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.lastUpdated ? formatDistanceToNow(new Date(session.lastUpdated), { addSuffix: true }) : "Unknown date"}
                    </div>
                    {session.messages && session.messages.length > 0 && (
                      <div className="text-xs mt-1 text-muted-foreground truncate max-w-[300px]">
                        {session.messages[session.messages.length - 1].content.substring(0, 60)}
                        {session.messages[session.messages.length - 1].content.length > 60 ? "..." : ""}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
