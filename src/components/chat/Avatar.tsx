
import { AgentIconType } from "@/types/message";
import { Bot, User, PenLine, Image, Wrench, Code, FileText, Zap, Brain, Lightbulb, Music, Video, Globe, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  isUser: boolean;
  agentType?: string;
  agentIcon?: AgentIconType;
  agentColor?: string;
}

export const Avatar = ({ isUser, agentType, agentIcon, agentColor }: AvatarProps) => {
  // Get the appropriate icon based on agent type or specified icon
  const getIcon = () => {
    if (isUser) return <User className="h-5 w-5 text-white" />;
    
    if (agentIcon) {
      // Return the appropriate icon based on agentIcon
      switch (agentIcon) {
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
    }
    
    // Fallback based on agent type
    if (agentType) {
      switch (agentType.toLowerCase()) {
        case "script": return <PenLine className="h-5 w-5" />;
        case "image": return <Image className="h-5 w-5" />;
        case "tool": return <Wrench className="h-5 w-5" />;
        case "browser": return <Globe className="h-5 w-5" />;
        case "product-video": 
        case "custom-video": return <Video className="h-5 w-5" />;
        default: return <Bot className="h-5 w-5" />;
      }
    }
    
    // Default to bot icon
    return <Bot className="h-5 w-5" />;
  };

  // Get the appropriate background color based on agent type or specified color
  const getBackgroundColor = () => {
    if (isUser) return "bg-blue-600";
    
    if (agentColor) return agentColor;
    
    if (agentType) {
      switch (agentType.toLowerCase()) {
        case "main": return "bg-indigo-600";
        case "script": return "bg-purple-600";
        case "image": return "bg-emerald-600";
        case "tool": return "bg-amber-600";
        case "scene": return "bg-rose-600";
        case "browser": return "bg-slate-600";
        case "product-video": return "bg-teal-600";
        case "custom-video": return "bg-violet-600";
        default: return "bg-gray-600";
      }
    }
    
    return "bg-gray-600";
  };

  return (
    <div className={cn(
      "flex items-center justify-center w-8 h-8 rounded-full",
      getBackgroundColor()
    )}>
      {getIcon()}
    </div>
  );
};
