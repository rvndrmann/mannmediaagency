
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cva } from "class-variance-authority";
import type { AgentType } from "@/hooks/use-multi-agent-chat";
import { getAgentIcon, getAgentName } from "@/lib/agent-icons";

const agentButtonVariants = cva(
  "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 border",
  {
    variants: {
      agentType: {
        main: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-400/30",
        script: "bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-400/30",
        image: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-400/30",
        tool: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-400/30",
        scene: "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-rose-400/30",
        data: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-400/30",
      },
      selected: {
        true: "ring-2 ring-offset-1 ring-offset-[#21283B] scale-110",
        false: "opacity-80 hover:opacity-100",
      },
    },
    defaultVariants: {
      agentType: "main",
      selected: false,
    },
  }
);

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelect: (agentType: AgentType) => void;
}

export function CompactAgentSelector({ selectedAgent, onSelect }: CompactAgentSelectorProps) {
  const agents: { type: AgentType; name: string; icon: string; description: string }[] = [
    { 
      type: "main", 
      name: "Main Assistant", 
      icon: "💬", 
      description: "General purpose assistant for various tasks" 
    },
    { 
      type: "script", 
      name: "Script Writer", 
      icon: "📝", 
      description: "Specializes in writing video scripts and creative content" 
    },
    { 
      type: "image", 
      name: "Image Generator", 
      icon: "🖼️", 
      description: "Creates detailed image prompts for visual content" 
    },
    { 
      type: "tool", 
      name: "Tool Specialist", 
      icon: "🔧", 
      description: "Executes specialized tools and technical tasks" 
    },
    { 
      type: "scene", 
      name: "Scene Creator", 
      icon: "🎬", 
      description: "Creates detailed scene descriptions for videos" 
    },
    {
      type: "data",
      name: "Data Agent",
      icon: "📊",
      description: "Extracts and processes data from various sources"
    }
  ];

  return (
    <div className="flex items-center justify-center space-x-2 py-2 px-1 bg-[#1A1F29]/50 backdrop-blur-sm border-b border-white/10">
      <TooltipProvider delayDuration={300}>
        {agents.map((agent) => (
          <Tooltip key={agent.type}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                className={agentButtonVariants({ 
                  agentType: agent.type as any, 
                  selected: selectedAgent === agent.type 
                })}
                onClick={() => onSelect(agent.type)}
                aria-label={agent.name}
              >
                <span role="img" aria-label={agent.name}>
                  {agent.icon}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#2D3240] border-[#434759] text-white text-xs">
              <p className="font-medium">{agent.name}</p>
              <p className="text-gray-300 text-[10px]">{agent.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
