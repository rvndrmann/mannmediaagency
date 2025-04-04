
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Edit3, Info } from "lucide-react"; // Added Edit3, Info
import { Message } from "@/types/message";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button"; // Added Button

export interface ChatMessageProps {
  message: Message;
  showAgentLabel?: boolean;
  showAgentName?: boolean; // Alias for showAgentLabel for backward compatibility
  onEditContent?: (type: string, content: string, messageId: string) => void; // Keep for potential other uses
  compact?: boolean; // Added compact prop
  // New props for triggering scene edits
  onEditSceneScript?: (sceneId: string) => void;
  onEditSceneVoiceover?: (sceneId: string) => void;
  onEditSceneImagePrompt?: (sceneId: string) => void;
  onEditSceneDescription?: (sceneId: string) => void;
}

export function ChatMessage({ 
  message, 
  showAgentLabel = false,
  showAgentName,  // Added for backward compatibility
  onEditContent,
  compact = false, // Default value for compact
  // Destructure new props
  onEditSceneScript,
  onEditSceneVoiceover,
  onEditSceneImagePrompt,
  onEditSceneDescription
}: ChatMessageProps) {
  
  // Use showAgentName as fallback for showAgentLabel for compatibility
  const shouldShowAgentLabel = showAgentLabel || showAgentName;
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAdminUpdate = isSystem && message.content?.startsWith("An administrator updated");
  const hasSceneId = !!message.sceneId;
  
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
  
  // Ensure message content exists and is a string
  const safeContent = message.content ? 
    (typeof message.content === 'string' ? message.content : JSON.stringify(message.content)) 
    : '';
  
  return (
    <div className={`flex items-start gap-3 ${compact ? 'mb-2' : 'mb-4'} ${isAdminUpdate ? 'bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md' : ''}`}>
      {/* Avatar */}
      <Avatar className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} mt-1`}>
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
      
      {/* Message content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {isUser ? 'You' : isSystem ? (isAdminUpdate ? 'Admin Update' : 'System') : (shouldShowAgentLabel ? getAgentLabel() : 'Assistant')}
            {/* Display Scene ID for non-user/non-system messages */}
            {!isUser && !isSystem && hasSceneId && (
              <span className="text-xs text-muted-foreground ml-2">(Scene: {message.sceneId})</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{getTimeDisplay()}</p>
        </div>
        
        <div className={`prose dark:prose-invert prose-sm max-w-none ${isAdminUpdate ? 'text-blue-800 dark:text-blue-200' : ''}`}>
          {safeContent}
        </div>

        {/* If there are attachments, we would render them here */}

        {/* Scene Edit Buttons - Show only for agent messages with a sceneId and if handlers are provided */}
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

        {/* Keep existing "Use as..." buttons if needed, maybe hide if edit buttons are shown? */}
        {/* For now, let's keep them separate */}
        {onEditContent && !isUser && !isSystem && !hasSceneId && ( // Only show if no scene edit buttons are shown
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
