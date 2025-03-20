
import React from 'react';
import { Bot, PenLine, Image, Wrench, Coffee } from 'lucide-react';

type AgentBadgeProps = {
  agentType: string;
};

export const AgentBadge = ({ agentType }: AgentBadgeProps) => {
  // Default badge config
  let icon = <Bot className="h-3.5 w-3.5" />;
  let label = agentType;
  let className = "bg-blue-600";
  
  // Configure based on agent type
  switch (agentType) {
    case 'main':
      label = "Main";
      icon = <Bot className="h-3.5 w-3.5" />;
      className = "bg-blue-600";
      break;
    case 'script':
      label = "Script";
      icon = <PenLine className="h-3.5 w-3.5" />;
      className = "bg-purple-600";
      break;
    case 'image':
      label = "Image";
      icon = <Image className="h-3.5 w-3.5" />;
      className = "bg-green-600";
      break;
    case 'tool':
      label = "Tool";
      icon = <Wrench className="h-3.5 w-3.5" />;
      className = "bg-amber-600";
      break;
    default:
      label = "Custom";
      icon = <Coffee className="h-3.5 w-3.5" />;
      className = "bg-indigo-600";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white ${className}`}>
      {icon}
      {label}
    </span>
  );
};
