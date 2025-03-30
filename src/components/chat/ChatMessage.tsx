
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Message } from "@/types/message";
import { format } from "date-fns";
import { ArrowRightLeft, Bot, Loader2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./CodeBlock";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
  showAgentName?: boolean;
}

export function ChatMessage({ 
  message, 
  isLoading = false, 
  showAgentName = true 
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isThinking = message.status === "thinking";
  const isError = message.status === "error";
  const hasHandoff = !!message.handoffRequest;
  
  if (isLoading) {
    return <MessageSkeleton isUser={isUser} />;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg",
        isUser ? "bg-muted/50" : "bg-background border",
        isSystem && "bg-slate-900 text-white",
        isError && "bg-red-500/10 border-red-500/20"
      )}
    >
      <Avatar className={cn("h-8 w-8", isUser ? "bg-primary" : "bg-muted")}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        <AvatarFallback>
          {isUser ? "U" : message.agentType?.charAt(0).toUpperCase() || "A"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="font-medium">
              {isUser ? "You" : message.agentType && showAgentName
                ? `${message.agentType.charAt(0).toUpperCase() + message.agentType.slice(1)} Agent` 
                : "Assistant"}
            </div>
            {message.agentType && !isUser && showAgentName && (
              <Badge variant="outline" className="text-xs">
                {message.agentType}
              </Badge>
            )}
            {hasHandoff && (
              <Badge variant="secondary" className="flex items-center text-xs">
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Handoff to {message.handoffRequest?.targetAgent}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {message.createdAt && format(new Date(message.createdAt), "p")}
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isThinking ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !props.inline && match ? (
                    <CodeBlock
                      value={String(children).replace(/\n$/, "")}
                      language={match[1]}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {hasHandoff && (
            <div className="mt-2 p-2 border rounded-md bg-muted/30">
              <p className="text-sm font-medium">Transferring to {message.handoffRequest?.targetAgent} agent</p>
              <p className="text-xs text-muted-foreground">{message.handoffRequest?.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageSkeleton({ isUser }: { isUser: boolean }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
