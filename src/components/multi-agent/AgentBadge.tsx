
import React from 'react';
import { Bot, PenLine, Image, Wrench, Coffee, FileText, Database } from 'lucide-react';

type AgentBadgeProps = {
  agentType: string;
  size?: "sm" | "md" | "lg";
};

export const AgentBadge = ({ agentType, size = "md" }: AgentBadgeProps) => {
  // Default badge config
  let icon = <Bot className="h-3.5 w-3.5" />;
  let label = agentType;
  let className = "bg-blue-600";
  
  // Configure icon size based on the size prop
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  
  // Configure based on agent type
  switch (agentType) {
    case 'main':
      label = "Main";
      icon = <Bot className={iconSize} />;
      className = "bg-blue-600";
      break;
    case 'script':
      label = "Script";
      icon = <PenLine className={iconSize} />;
      className = "bg-purple-600";
      break;
    case 'image':
      label = "Image";
      icon = <Image className={iconSize} />;
      className = "bg-green-600";
      break;
    case 'tool':
      label = "Tool";
      icon = <Wrench className={iconSize} />;
      className = "bg-amber-600";
      break;
    case 'scene':
      label = "Scene";
      icon = <FileText className={iconSize} />;
      className = "bg-rose-600";
      break;
    case 'data':
      label = "Data";
      icon = <Database className={iconSize} />;
      className = "bg-cyan-600";
      break;
    case 'assistant':
      label = "Assistant";
      icon = <Bot className={iconSize} />;
      className = "bg-indigo-600";
      break;
    default:
      label = "Custom";
      icon = <Coffee className={iconSize} />;
      className = "bg-indigo-600";
      break;
  }

  // Adjust text size based on badge size
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  const paddingSize = size === "sm" ? "px-1 py-0.5" : size === "lg" ? "px-2 py-1" : "px-1.5 py-0.5";

  return (
    <span className={`inline-flex items-center gap-1 ${paddingSize} rounded ${textSize} font-medium text-white ${className}`}>
      {icon}
      {label}
    </span>
  );
};

export type { AgentBadgeProps };
