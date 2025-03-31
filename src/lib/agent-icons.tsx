
import { 
  Bot, 
  FileText, 
  Image, 
  Hammer, 
  Camera, 
  BarChart,
  Sparkles,
  Headphones,
  Cpu
} from "lucide-react";
import React from 'react';

export type AgentIconType = 
  | "main" 
  | "script" 
  | "image" 
  | "tool" 
  | "scene" 
  | "data" 
  | "assistant" 
  | "audio" 
  | "system";

export function getAgentIcon(agentType: AgentIconType | string, className: string = "h-5 w-5"): React.ReactNode {
  switch (agentType) {
    case "main":
    case "assistant":
      return <Bot className={className} />;
    case "script":
      return <FileText className={className} />;
    case "image":
      return <Image className={className} />;
    case "tool":
      return <Hammer className={className} />;
    case "scene":
      return <Camera className={className} />;
    case "data":
      return <BarChart className={className} />;
    case "audio":
      return <Headphones className={className} />;
    case "system":
      return <Cpu className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}
