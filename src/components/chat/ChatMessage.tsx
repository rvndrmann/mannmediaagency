
import { Message } from "@/types/message";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { MessageStatus } from "@/components/chat/MessageStatus";
import { cn } from "@/lib/utils";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { getAgentIcon } from "@/lib/agent-icons";
import { CanvasContentDisplay } from "./CanvasContentDisplay";
import { Button } from "../ui/button";
import { Edit, Pencil } from "lucide-react";
import { useState } from "react";

const agentFullNames = {
  main: "Main Assistant",
  script: "Script Writer",
  image: "Image Generator",
  tool: "Tool Assistant",
  scene: "Scene Creator"
};

interface ChatMessageProps {
  message: Message;
  showAgentName?: boolean;
  onEditContent?: (type: string, content: string, sceneId: string) => void;
}

export function ChatMessage({ message, showAgentName = true, onEditContent }: ChatMessageProps) {
  const [showCanvasContent, setShowCanvasContent] = useState(true);
  
  const hasCanvasContent = 
    message.role === "assistant" && 
    message.canvasContent;
  
  return (
    <div
      className={cn(
        "flex gap-3 group",
        message.role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn(
        "rounded-md overflow-hidden mt-1 w-8 h-8 border",
        message.role === "user" ? "bg-primary" : "bg-secondary",
        message.agentType === "tool" && "bg-emerald-500",
        message.agentType === "script" && "bg-blue-500",
        message.agentType === "image" && "bg-purple-500",
        message.agentType === "scene" && "bg-amber-500",
        message.type === "system" && "bg-gray-500",
        message.type === "error" && "bg-red-500"
      )}>
        {message.role === "user" ? (
          <div className="text-white font-medium flex items-center justify-center h-full text-sm">
            U
          </div>
        ) : message.type === "system" ? (
          <div className="text-white font-medium flex items-center justify-center h-full text-sm">
            S
          </div>
        ) : message.type === "error" ? (
          <div className="text-white font-medium flex items-center justify-center h-full text-sm">
            !
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            {React.createElement(getAgentIcon(message.agentType || "main"), { className: "w-4 h-4 text-white" })}
          </div>
        )}
      </Avatar>
      
      <div className={cn(
        "flex flex-col max-w-[90%] sm:max-w-[75%]",
        message.role === "user" ? "items-end" : "items-start"
      )}>
        {showAgentName && message.role === "assistant" && message.agentType && (
          <span className={cn(
            "text-xs font-medium mb-1",
            message.agentType === "main" && "text-slate-400",
            message.agentType === "tool" && "text-emerald-400",
            message.agentType === "script" && "text-blue-400",
            message.agentType === "image" && "text-purple-400",
            message.agentType === "scene" && "text-amber-400"
          )}>
            {agentFullNames[message.agentType as keyof typeof agentFullNames] || message.agentType}
          </span>
        )}
        
        <div className={cn(
          "p-3 rounded-lg",
          message.role === "user" 
            ? "bg-primary text-primary-foreground" 
            : message.type === "system" 
              ? "bg-muted text-muted-foreground text-sm" 
              : message.type === "error"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-500/20"
                : "bg-muted text-card-foreground"
        )}>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3">
              <AttachmentPreview 
                attachments={message.attachments} 
                onRemove={undefined} 
              />
            </div>
          )}
          
          <Markdown>{message.content}</Markdown>
          
          {message.status && (
            <div className="mt-2">
              <MessageStatus status={message.status} message={message.statusMessage} />
            </div>
          )}
        </div>
        
        {/* Canvas Content Display */}
        {hasCanvasContent && showCanvasContent && (
          <div className="mt-2 max-w-full w-full">
            <CanvasContentDisplay
              title={message.canvasContent?.title || "Scene Content"}
              sceneId={message.canvasContent?.sceneId || ""}
              script={message.canvasContent?.script}
              description={message.canvasContent?.description}
              imagePrompt={message.canvasContent?.imagePrompt}
              voiceOverText={message.canvasContent?.voiceOverText}
              onEditClick={onEditContent}
            />
          </div>
        )}
        
        {hasCanvasContent && (
          <div className="self-end mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowCanvasContent(!showCanvasContent)}
              className="h-6 text-xs text-muted-foreground"
            >
              {showCanvasContent ? "Hide Content" : "Show Canvas Content"}
            </Button>
          </div>
        )}
        
        <span className="text-[10px] text-muted-foreground mt-1 select-none">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
