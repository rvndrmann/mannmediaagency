
import React from "react";
import { Message } from "@/types/message";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import ReactMarkdown from "react-markdown";
import { HandoffIndicator } from "../multi-agent/HandoffIndicator";
import { AttachmentPreview } from "../multi-agent/AttachmentPreview";

interface ChatMessageProps {
  message: Message;
  showAgentName?: boolean;
}

export function ChatMessage({ message, showAgentName = true }: ChatMessageProps) {
  const { user } = useUser();
  const isUser = message.role === "user";
  
  return (
    <div
      className={cn(
        "py-2 flex flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className="flex gap-3 max-w-[85%]">
        {!isUser && (
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src="/placeholder.svg" 
              alt="AI" 
            />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          "rounded-lg px-4 py-2.5 max-w-full",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          {!isUser && showAgentName && message.agentName && (
            <div className="text-xs text-muted-foreground mb-1">
              {message.agentName}
            </div>
          )}
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3">
              <AttachmentPreview attachments={message.attachments} />
            </div>
          )}
          
          <div className="prose dark:prose-invert max-w-full text-sm break-words">
            <ReactMarkdown
              components={{
                pre: ({ node, ...props }) => (
                  <div className="mb-2 mt-2 overflow-auto w-full">
                    <pre {...props} />
                  </div>
                ),
                code: ({ node, className, children, ...props }) => {
                  const isInline = props.className === undefined;
                  
                  if (isInline) {
                    return (
                      <code className={cn("px-1 py-0.5 rounded text-red-500 bg-muted", className)} {...props}>
                        {children}
                      </code>
                    );
                  }
                  
                  return (
                    <CodeBlock
                      language={(className || "").replace("language-", "")}
                      value={String(children).replace(/\n$/, "")}
                      {...props}
                    />
                  );
                },
              }}
            >
              {message.content || ""}
            </ReactMarkdown>
          </div>
          
          {message.handoffRequest && (
            <div className="mt-3">
              <HandoffIndicator 
                agent={message.handoffRequest.targetAgent}
                reason={message.handoffRequest.reason}
              />
            </div>
          )}
        </div>
        
        {isUser && (
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user?.avatarUrl || "/placeholder.svg"} 
              alt={user?.username || "User"} 
            />
            <AvatarFallback>
              {user?.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
