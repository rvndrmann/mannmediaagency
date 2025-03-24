
import { Message } from "@/types/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, User, Bot, PenLine, Image, Wrench, Code, FileText, Brain, Lightbulb, Music, Video, Globe, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";

interface ChatMessageProps {
  message: Message;
  showAgentName?: boolean;
}

export const ChatMessage = ({ message, showAgentName = false }: ChatMessageProps) => {
  // Handle empty messages gracefully
  if (!message || !message.content) return null;
  
  const isUser = message.role === "user";
  const isLoading = message.status === "thinking" || message.status === "working";

  // Determine agent icon based on agentType or agentIcon
  const getAgentIcon = () => {
    if (isUser) return <User className="h-5 w-5" />;
    
    const iconType = message.agentIcon || 
      (message.agentType === "main" ? "Bot" : 
       message.agentType === "script" ? "PenLine" :
       message.agentType === "image" ? "Image" :
       message.agentType === "tool" ? "Wrench" :
       message.agentType === "scene" ? "PenLine" : "Bot");

    switch (iconType) {
      case "Bot": return <Bot className="h-5 w-5" />;
      case "PenLine": return <PenLine className="h-5 w-5" />;
      case "Image": return <Image className="h-5 w-5" />;
      case "Wrench": return <Wrench className="h-5 w-5" />;
      case "Code": return <Code className="h-5 w-5" />;
      case "FileText": return <FileText className="h-5 w-5" />;
      case "Zap": return <Zap className="h-5 w-5" />;
      case "Brain": return <Brain className="h-5 w-5" />;
      case "Lightbulb": return <Lightbulb className="h-5 w-5" />;
      case "Music": return <Music className="h-5 w-5" />;
      case "Video": return <Video className="h-5 w-5" />;
      case "Globe": return <Globe className="h-5 w-5" />;
      case "ShoppingBag": return <ShoppingBag className="h-5 w-5" />;
      default: return <Bot className="h-5 w-5" />;
    }
  };

  // Get color class for agent avatar
  const getAgentColor = () => {
    if (isUser) return "bg-gradient-to-r from-indigo-400 to-cyan-400";
    
    // Custom agent color if available, otherwise use fixed colors
    if (message.agentColor) return message.agentColor;
    
    switch (message.agentType) {
      case "main": return "bg-gradient-to-r from-blue-400 to-indigo-500";
      case "script": return "bg-gradient-to-r from-purple-400 to-pink-500";
      case "image": return "bg-gradient-to-r from-emerald-400 to-cyan-500";
      case "tool": return "bg-gradient-to-r from-amber-400 to-orange-500";
      case "scene": return "bg-gradient-to-r from-rose-400 to-red-500";
      default: return "bg-gradient-to-r from-blue-400 to-indigo-500";
    }
  };

  // Get agent name display text
  const getAgentName = () => {
    if (isUser) return "You";
    if (message.agentName) return message.agentName;
    
    switch (message.agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Prompt";
      case "tool": return "Tool Orchestrator";
      case "scene": return "Scene Description";
      case "browser": return "Browser Assistant";
      case "product-video": return "Product Video";
      case "custom-video": return "Video Request";
      default: return message.agentType ? `${message.agentType.charAt(0).toUpperCase()}${message.agentType.slice(1)} Assistant` : "Assistant";
    }
  };

  // Display tasks if available
  const renderTasks = () => {
    if (!message.tasks || message.tasks.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1 text-sm text-gray-400">
        {message.tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${
              task.status === "completed" ? "bg-green-500" : 
              task.status === "error" || task.status === "failed" ? "bg-red-500" :
              task.status === "in-progress" || task.status === "in_progress" ? "bg-blue-500 animate-pulse" :
              "bg-gray-500"
            }`} />
            <span>{task.description || task.name}</span>
            {task.details && task.status === "error" && (
              <span className="text-red-400 text-xs">{task.details}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 ${isUser ? "" : "mt-4"}`}>
      <Avatar className={`h-8 w-8 rounded-md ${getAgentColor()}`}>
        <AvatarFallback>{getAgentIcon()}</AvatarFallback>
        <AvatarImage src="" />
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{getAgentName()}</span>
          
          {showAgentName && message.agentType && (
            <Badge variant="outline" className="text-xs py-0 h-5 bg-slate-800/50">
              {message.agentType}
            </Badge>
          )}
          
          {isLoading && (
            <div className="ml-2 flex gap-1">
              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse delay-150"></div>
              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse delay-300"></div>
            </div>
          )}
        </div>

        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>
            {message.content}
          </ReactMarkdown>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2">
            <AttachmentPreview
              attachments={message.attachments}
              onRemove={() => {}}
              isRemovable={false}
            />
          </div>
        )}

        {renderTasks()}
      </div>
    </div>
  );
};
