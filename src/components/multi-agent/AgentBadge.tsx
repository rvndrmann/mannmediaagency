
import React from 'react';
import { Bot, PenLine, Image, Wrench, Coffee, Globe, Video, ShoppingBag, FileText, MoreVertical, Music, Mic, Zap } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AgentInfo } from '@/types/message';

export type AgentBadgeProps = {
  agent: AgentInfo;
  onEdit?: () => void;
  onDelete?: (agentId: string) => Promise<void>;
};

export const AgentBadge = ({ agent, onEdit, onDelete }: AgentBadgeProps) => {
  // Default badge config
  let icon = <Bot className="h-3.5 w-3.5" />;
  let label = agent.id;
  let className = "bg-blue-600";
  
  // Configure based on agent type
  switch (agent.id) {
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
    case 'scene':
      label = "Scene";
      icon = <FileText className="h-3.5 w-3.5" />;
      className = "bg-emerald-600";
      break;
    case 'browser':
      label = "Browser";
      icon = <Globe className="h-3.5 w-3.5" />;
      className = "bg-cyan-600";
      break;
    case 'product-video':
      label = "Product Video";
      icon = <Video className="h-3.5 w-3.5" />;
      className = "bg-red-600";
      break;
    case 'custom-video':
      label = "Custom Video";
      icon = <Video className="h-3.5 w-3.5" />;
      className = "bg-pink-600";
      break;
    case 'voiceover':
      label = "Voiceover";
      icon = <Mic className="h-3.5 w-3.5" />;
      className = "bg-indigo-600";
      break;
    case 'music':
      label = "Music";
      icon = <Music className="h-3.5 w-3.5" />;
      className = "bg-yellow-600";
      break;
    case 'orchestrator':
      label = "Orchestrator";
      icon = <Zap className="h-3.5 w-3.5" />;
      className = "bg-orange-600";
      break;
    default:
      label = agent.name || "Custom";
      icon = <Coffee className="h-3.5 w-3.5" />;
      className = "bg-indigo-600";
      break;
  }

  // If no edit/delete handlers provided, just show the badge without dropdown
  if (!onEdit && !onDelete) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white ${className}`}>
        {icon}
        {label}
      </span>
    );
  }

  return (
    <div className="inline-flex">
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-l text-xs font-medium text-white ${className}`}>
        {icon}
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className={`${className} text-white rounded-r text-xs h-5 px-1 flex items-center justify-center`}>
          <MoreVertical className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              Edit
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem 
              onClick={() => onDelete(agent.id)}
              className="text-red-500"
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
