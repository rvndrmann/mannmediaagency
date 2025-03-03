
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Message, Task } from "@/types/message";
import { Check, Clock, Loader2, XCircle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
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

  return (
    <Card
      className={`p-4 max-w-[80%] ${
        message.role === "user"
          ? "ml-auto bg-[#9b87f5] text-white"
          : "bg-[#333333] text-white/90 border-white/10"
      }`}
    >
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
        }}
      >
        {message.content}
      </ReactMarkdown>

      {message.tasks && message.tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs font-medium text-white/60 mb-2">
            {message.status === "thinking" && "Analyzing your request..."}
            {message.status === "working" && "Working on tasks..."}
            {message.status === "completed" && "All tasks completed"}
            {message.status === "error" && "Error occurred"}
          </div>
          <ul className="space-y-2">
            {message.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 flex-shrink-0">
                  {getTaskStatusIcon(task.status)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white/80">{task.name}</div>
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
    </Card>
  );
};
