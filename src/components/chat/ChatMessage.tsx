
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/chat/Avatar";
import { motion } from "framer-motion";
import { Message, SimpleMessage } from "@/types/message";

interface ChatMessageProps {
  message: Message;
  showAgentName?: boolean;
}

export const ChatMessage = ({ message, showAgentName = false }: ChatMessageProps) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';
  
  if (isTool) {
    return (
      <div className="flex items-start gap-2 text-gray-400 text-xs bg-gray-800/40 p-2 rounded">
        <div className="font-mono">[Tool Output]: {message.content}</div>
      </div>
    );
  }
  
  if (isSystem) {
    return (
      <div className="flex items-start gap-2 text-gray-400 text-xs italic">
        <div>{message.content}</div>
      </div>
    );
  }
  
  const isSimpleMessage = (msg: any): msg is SimpleMessage => {
    return typeof msg === 'object' && ('role' in msg) && !('id' in msg);
  };
  
  const normalizedMessage: Message = isSimpleMessage(message) 
    ? {
        id: `msg-${Math.random().toString(36).substr(2, 9)}`,
        role: message.role,
        content: message.content,
        createdAt: new Date().toISOString(),
        status: message.status
      } 
    : message;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-all",
        isUser ? "bg-blue-900/20" : "bg-gray-800/40",
        isFocused && "bg-opacity-70"
      )}
    >
      <Avatar 
        isUser={isUser} 
        agentType={normalizedMessage.agentType} 
        agentIcon={normalizedMessage.agentIcon}
        agentColor={normalizedMessage.agentColor}
      />
      
      <div className="flex-1 space-y-2 overflow-hidden">
        {(showAgentName && !isUser && normalizedMessage.agentType) && (
          <div className="text-xs font-medium text-purple-400">
            {normalizedMessage.agentName || normalizedMessage.agentType.charAt(0).toUpperCase() + normalizedMessage.agentType.slice(1)} Agent
          </div>
        )}
        
        <div className={cn(
          "text-sm prose prose-invert max-w-none",
          normalizedMessage.status === "thinking" && "text-gray-400"
        )}>
          {normalizedMessage.status === "thinking" ? (
            <ThinkingAnimation content={normalizedMessage.content} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: formatMessageContent(normalizedMessage.content) }} />
          )}
        </div>
        
        {normalizedMessage.status === "error" && (
          <div className="mt-2 text-xs text-red-400">
            There was an error processing this message. Please try again.
          </div>
        )}
        
        {normalizedMessage.tasks && normalizedMessage.tasks.length > 0 && (
          <div className="mt-2 space-y-1">
            {normalizedMessage.tasks.map((task) => (
              <div key={task.id} className="flex items-center text-xs">
                <StatusIcon status={task.status} />
                <span className={cn(
                  "ml-1.5",
                  task.status === "completed" ? "text-green-400" : 
                  task.status === "failed" || task.status === "error" ? "text-red-400" : 
                  "text-gray-400"
                )}>
                  {task.name} {task.details && `- ${task.details}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ThinkingAnimation = ({ content }: { content: string }) => {
  return (
    <div className="flex items-center">
      <span>{content}</span>
      <span className="inline-flex ml-1">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0 }}
          className="mx-[1px]"
        >
          .
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.2, repeatDelay: 0 }}
          className="mx-[1px]"
        >
          .
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.4, repeatDelay: 0 }}
          className="mx-[1px]"
        >
          .
        </motion.span>
      </span>
    </div>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  return (
    <div className={cn(
      "w-3 h-3 rounded-full",
      status === "pending" ? "bg-gray-500" :
      status === "in_progress" || status === "in-progress" ? "bg-blue-500 animate-pulse" :
      status === "completed" ? "bg-green-500" :
      "bg-red-500" // error or failed
    )} />
  );
};

const formatMessageContent = (content: string): string => {
  let formattedContent = content.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>'
  );
  
  formattedContent = formattedContent.replace(
    /```([a-z]*)\n([\s\S]*?)\n```/g,
    '<pre class="bg-gray-900 p-3 rounded-md overflow-x-auto my-2"><code class="text-gray-300 font-mono text-sm">$2</code></pre>'
  );
  
  formattedContent = formattedContent.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-900 px-1 py-0.5 rounded text-gray-300 font-mono text-sm">$1</code>'
  );
  
  formattedContent = formattedContent.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  formattedContent = formattedContent.replace(
    /\*([^*]+)\*/g,
    '<em>$1</em>'
  );
  
  formattedContent = formattedContent.replace(/\n/g, '<br>');
  
  return formattedContent;
};
