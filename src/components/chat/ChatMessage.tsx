import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Edit3, Info } from "lucide-react";
import { Message } from "@/types/message";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

export interface ChatMessageProps {
  message: Message;
  showAgentLabel?: boolean;
  showAgentName?: boolean;
  onEditContent?: (type: string, content: string, messageId: string) => void;
  compact?: boolean;
  onEditSceneScript?: (sceneId: string) => void;
  onEditSceneVoiceover?: (sceneId: string) => void;
  onEditSceneImagePrompt?: (sceneId: string) => void;
  onEditSceneDescription?: (sceneId: string) => void;
}

export function ChatMessage({
  message,
  showAgentLabel = false,
  showAgentName,
  onEditContent,
  compact = false,
  onEditSceneScript,
  onEditSceneVoiceover,
  onEditSceneImagePrompt,
  onEditSceneDescription
}: ChatMessageProps) {

  const shouldShowAgentLabel = showAgentLabel || showAgentName;

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAdminUpdate = isSystem && message.content?.startsWith("An administrator updated");
  const hasSceneId = !!message.sceneId;

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

  const getAgentLabel = () => {
    if (!message.agentType) return 'Assistant';

    switch (message.agentType) {
      case 'main': return 'Assistant';
      case 'script': return 'Script Writer';
      case 'image': return 'Image Generator';
      case 'tool': return 'Tool Specialist';
      case 'scene': return 'Scene Creator';
      case 'data': return 'Data Agent';
      case 'assistant': return 'Assistant';
      case 'scene-generator': return 'Scene Generator';
      default: return message.agentType.charAt(0).toUpperCase() + message.agentType.slice(1);
    }
  };

  const handleEditContent = (type: string) => {
    if (onEditContent && message.content && message.id) {
      onEditContent(type, message.content, message.id);
    }
  };

  const safeContent = message.content ?
    (typeof message.content === 'string' ? message.content : JSON.stringify(message.content))
    : '';

  return (
    <div className={`flex items-start gap-3 ${compact ? 'mb-2' : 'mb-4'} ${isAdminUpdate ? 'bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md' : ''} ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} mt-1 rounded-full`}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : isAdminUpdate ? (
          <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
            <Info className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1">
        {/* Message Bubble */}
        <div className={`relative rounded-lg px-3 py-2 max-w-[80%] ${isUser ? 'bg-green-100 dark:bg-green-800 text-gray-900 dark:text-gray-100 ml-auto' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-auto'}`}>
          {/* Sender Name/Label */}
          <p className="font-medium text-sm mb-1">
            {message.senderName ? message.senderName : (isUser ? 'You' : isSystem ? (isAdminUpdate ? 'Admin Update' : 'System') : (shouldShowAgentLabel ? getAgentLabel() : 'Assistant'))}
            {/* Display Scene ID and Project ID if available */}
            {(!isUser && !isSystem) && (hasSceneId || message.projectId) && (
              <span className="text-xs text-muted-foreground ml-2">
                (
                {hasSceneId && `Scene: ${message.sceneId}`}
                {hasSceneId && message.projectId && ', '}
                {message.projectId && (
                  <>
                    Project: <Link to={`/canvas/${message.projectId}`} className="text-blue-500 hover:underline">{message.projectId}</Link>
                  </>
                )}
                )
              </span>
            )}
          </p>
          {/* Message Content */}
          <div className={`prose dark:prose-invert prose-sm max-w-none break-words ${isAdminUpdate ? 'text-blue-800 dark:text-blue-200' : ''}`}>
            {safeContent}
          </div>
          {/* Timestamp */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{getTimeDisplay()}</p>
        </div>
      </div>

      {!isUser && !isSystem && hasSceneId && (
          <div className="flex flex-wrap mt-2 gap-2">
            {onEditSceneScript && (
              <Button variant="outline" size="sm" onClick={() => onEditSceneScript(message.sceneId!)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Script
              </Button>
            )}
            {onEditSceneVoiceover && (
              <Button variant="outline" size="sm" onClick={() => onEditSceneVoiceover(message.sceneId!)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Voiceover
              </Button>
            )}
            {onEditSceneImagePrompt && (
              <Button variant="outline" size="sm" onClick={() => onEditSceneImagePrompt(message.sceneId!)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Image Prompt
              </Button>
            )}
            {onEditSceneDescription && (
              <Button variant="outline" size="sm" onClick={() => onEditSceneDescription(message.sceneId!)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Description
              </Button>
            )}
          </div>
        )}

        {onEditContent && !isUser && !isSystem && !hasSceneId && (
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
  );
}
