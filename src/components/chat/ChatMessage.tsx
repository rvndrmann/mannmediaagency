
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Message, Task } from "@/types/message";
import { Check, Clock, Loader2, XCircle, AlertTriangle, RefreshCw, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
  showAgentName?: boolean;
}

export const ChatMessage = ({ message, onRetry, showAgentName }: ChatMessageProps) => {
  // Helper to render task status icon
  const getTaskStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "in-progress":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const isError = message.status === "error";
  const isUser = message.role === "user";
  const isAgent = message.role === "assistant" && message.agentType;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasHandoffRequest = message.handoffRequest != null;

  return (
    <Card
      className={cn(
        "p-4 shadow-md transition-all animate-in duration-300",
        isUser
          ? "ml-auto bg-gradient-to-r from-[#9b87f5] to-[#8a77e1] text-white max-w-[80%] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-sm"
          : isError 
            ? "bg-red-900/30 text-white/90 border-red-500/30 max-w-[80%] rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg" 
            : "bg-[#333333] text-white/90 border-white/10 max-w-[80%] rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg"
      )}
    >
      {isError && (
        <div className="mb-2 flex items-center gap-2 text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Error processing request</span>
        </div>
      )}
      
      {isAgent && message.agentType && showAgentName && (
        <Badge 
          variant={
            message.agentType === "main" ? "default" : 
            message.agentType === "script" ? "info" : 
            message.agentType === "image" ? "warning" : 
            "success"
          }
          className="mb-3 text-xs"
        >
          {message.agentType === "main" ? "Main Assistant" : 
           message.agentType === "script" ? "Script Writer" : 
           message.agentType === "image" ? "Image Prompt" : "Tool Orchestrator"}
        </Badge>
      )}
      
      {hasAttachments && (
        <div className={cn("rounded-md overflow-hidden", isUser ? "bg-white/10" : "bg-black/20")}>
          <AttachmentPreview 
            attachments={message.attachments} 
            isRemovable={false}
          />
        </div>
      )}
      
      <div className={cn(hasAttachments ? "mt-3" : "")}>
        <ReactMarkdown
          components={{
            code({ children, className, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return (
                <code
                  className={`${match ? 'bg-black/30 p-2 block rounded' : 'bg-black/30 px-1 py-0.5 rounded'} ${className}`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p({ children }) {
              return <p className="mb-3 last:mb-0">{children}</p>;
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {hasHandoffRequest && (
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2 text-blue-300">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="text-sm">
            Transferring to{" "}
            <Badge variant="outline" className="text-xs py-0 px-1 border-blue-400/30">
              {message.handoffRequest?.targetAgent === "main" ? "Main Assistant" : 
               message.handoffRequest?.targetAgent === "script" ? "Script Writer" : 
               message.handoffRequest?.targetAgent === "image" ? "Image Prompt" : "Tool Orchestrator"}
            </Badge>
          </span>
        </div>
      )}

      {message.tasks && message.tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs font-medium text-white/60 mb-2 flex items-center justify-between">
            <span>
              {message.status === "thinking" && "Analyzing your request..."}
              {message.status === "working" && "Working on tasks..."}
              {message.status === "completed" && "All tasks completed"}
              {message.status === "error" && "Error occurred"}
            </span>
            
            {isError && onRetry && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRetry}
                className="h-6 px-2 text-xs text-red-300 hover:text-white hover:bg-red-800/50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
          
          <ul className="space-y-2">
            {message.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 flex-shrink-0">
                  {getTaskStatusIcon(task.status)}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    task.status === "error" ? "text-red-300" : "text-white/80"
                  }`}>
                    {task.name}
                  </div>
                  {task.details && (
                    <div className="text-xs text-white/60 mt-0.5">{task.details}</div>
                  )}
                  {task.status === "in-progress" && (
                    <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isError && message.command && (
        <div className="mt-3 pt-3 border-t border-red-500/30">
          <div className="text-xs text-red-300">
            <p>Connection to AI service failed. Please try again later.</p>
          </div>
        </div>
      )}
    </Card>
  );
};
