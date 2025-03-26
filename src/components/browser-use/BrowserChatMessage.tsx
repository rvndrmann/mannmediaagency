
import React from 'react';
import { ChatMessage } from '@/hooks/browser-use/types';
import { formatDistanceToNow } from 'date-fns';
import { Bot, User, Info, AlertCircle, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface BrowserChatMessageProps {
  message: ChatMessage;
  showTimestamp?: boolean;
}

export function BrowserChatMessage({ message, showTimestamp = true }: BrowserChatMessageProps) {
  // Determine message timestamp
  const timestamp = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true }) 
    : '';
  
  // Render based on message type
  const renderMessageContent = () => {
    switch (message.type) {
      case 'user':
        return <p className="text-sm break-words">{message.text}</p>;
      
      case 'system':
        return <p className="text-sm break-words text-muted-foreground">{message.text}</p>;
      
      case 'error':
        return (
          <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 break-words">{message.text}</p>
          </div>
        );
      
      case 'step':
        return (
          <div className="border-l-2 border-primary pl-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">Step {message.stepNumber}</Badge>
              <span className="text-sm font-medium">{message.goal}</span>
            </div>
            {message.evaluation && (
              <p className="text-xs text-muted-foreground mt-1">{message.evaluation}</p>
            )}
          </div>
        );
      
      case 'recording':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Play size={14} className="text-green-500" />
              Task Recording Available
            </p>
            {message.urls && message.urls.length > 0 && (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                <iframe 
                  src={message.urls[0]} 
                  className="w-full h-full" 
                  title="Task Recording" 
                  allowFullScreen 
                />
              </div>
            )}
          </div>
        );
      
      default:
        return <p className="text-sm break-words">{String(message.text)}</p>;
    }
  };
  
  // Determine avatar based on message type
  const renderAvatar = () => {
    switch (message.type) {
      case 'user':
        return (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={18} className="text-primary" />
          </div>
        );
      
      case 'system':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Info size={18} className="text-blue-500" />
          </div>
        );
      
      case 'error':
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-500" />
          </div>
        );
      
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Bot size={18} className="text-violet-500" />
          </div>
        );
    }
  };
  
  return (
    <div className="flex gap-3 py-3">
      {renderAvatar()}
      <div className="flex-1">
        <div className="mb-1">
          {renderMessageContent()}
        </div>
        {showTimestamp && timestamp && (
          <p className="text-xs text-gray-400">{timestamp}</p>
        )}
      </div>
    </div>
  );
}
