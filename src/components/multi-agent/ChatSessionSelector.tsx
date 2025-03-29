
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useChatSession } from '@/contexts/ChatSessionContext';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';

interface ChatSessionSelectorProps {
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
}

export const ChatSessionSelector = ({ onClose, onSelectSession }: ChatSessionSelectorProps) => {
  const { chatSessions, activeChatId } = useChatSession();

  // Ensure chat sessions are loaded
  useEffect(() => {
    console.log("Chat sessions loaded:", chatSessions.length);
  }, [chatSessions]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex justify-between items-center border-b">
        <h3 className="font-medium">Chat History</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        {chatSessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No chat history found
          </div>
        ) : (
          chatSessions.map(session => (
            <div 
              key={session.id}
              className={`p-3 border rounded-md mb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 ${
                session.id === activeChatId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => {
                console.log("Selected session:", session.id);
                onSelectSession(session.id);
              }}
            >
              <div className="font-medium text-sm">
                {session.title || 'Untitled Chat'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {formatDistanceToNow(new Date(session.lastUpdated), { addSuffix: true })}
              </div>
              {session.messages && session.messages.length > 0 && (
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {session.messages[session.messages.length - 1]?.content?.substring(0, 50)}
                  {session.messages[session.messages.length - 1]?.content?.length > 50 ? '...' : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
