
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { Message } from "@/types/message";
import { formatDistanceToNow } from 'date-fns';

export interface ChatMessageProps {
  message: Message;
  showAgentLabel?: boolean;
  showAgentName?: boolean; // Alias for showAgentLabel for backward compatibility
  onEditContent?: (type: string, content: string, messageId: string) => void;
  compact?: boolean; // Added compact prop
}

export function ChatMessage({ 
  message, 
  showAgentLabel = false,
  showAgentName,  // Added for backward compatibility
  onEditContent,
  compact = false // Default value for compact
}: ChatMessageProps) {
  
  // Use showAgentName as fallback for showAgentLabel for compatibility
  const shouldShowAgentLabel = showAgentLabel || showAgentName;
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Format time display
  const getTimeDisplay = () => {
    try {
      if (message.createdAt) {
        return formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });
      }
      return '';
    } catch (err) {
      return '';
    }
  };
  
  // Get agent name from type
  const getAgentLabel = () => {
    if (!message.agentType) return 'Assistant';
    
    switch (message.agentType) {
      case 'main': return 'Assistant';
      case 'script': return 'Script Writer';
      case 'image': return 'Image Generator';
      case 'tool': return 'Tool Specialist';
      case 'scene': return 'Scene Creator';
      default: return message.agentType.charAt(0).toUpperCase() + message.agentType.slice(1);
    }
  };
  
  const handleEditContent = (type: string) => {
    if (onEditContent && message.content && message.id) {
      onEditContent(type, message.content, message.id);
    }
  };
  
  return (
    <div className={`flex items-start gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
      {/* Avatar */}
      <Avatar className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} mt-1`}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      
      {/* Message content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {isUser ? 'You' : isSystem ? 'System' : (shouldShowAgentLabel ? getAgentLabel() : 'Assistant')}
          </p>
          <p className="text-xs text-muted-foreground">{getTimeDisplay()}</p>
        </div>
        
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {message.content}
        </div>
        
        {/* If there are attachments, we would render them here */}
        
        {/* Edit buttons for canvas content */}
        {onEditContent && !isUser && !isSystem && (
          <div className="flex mt-2 gap-2">
            <button 
              onClick={() => handleEditContent('script')}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Use as Script
            </button>
            <button 
              onClick={() => handleEditContent('description')}
              className="text-xs text-green-500 hover:text-green-700"
            >
              Use as Description
            </button>
            <button 
              onClick={() => handleEditContent('imagePrompt')}
              className="text-xs text-purple-500 hover:text-purple-700"
            >
              Use as Image Prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
