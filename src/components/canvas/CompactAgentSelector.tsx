
import { Bot, PenLine, Image, Wrench, FileText, Database } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import type { AgentType } from '@/hooks/multi-agent/runner/types';

type AgentOption = {
  id: AgentType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
};

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelect: (agentId: AgentType) => void;
}

export function CompactAgentSelector({ selectedAgent, onSelect }: CompactAgentSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const agents: AgentOption[] = [
    {
      id: 'main',
      name: 'AI',
      icon: <Bot className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-blue-400 to-indigo-500',
      description: 'General AI assistant'
    },
    {
      id: 'script',
      name: 'Script',
      icon: <PenLine className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-amber-400 to-orange-500',
      description: 'Creates scripts and narratives'
    },
    {
      id: 'image',
      name: 'Image',
      icon: <Image className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-emerald-400 to-green-500',
      description: 'Creates AI image prompts'
    },
    {
      id: 'data',
      name: 'Data',
      icon: <Database className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-cyan-400 to-blue-500',
      description: 'Extracts & manages media data'
    },
    {
      id: 'tool',
      name: 'Tools',
      icon: <Wrench className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-purple-400 to-violet-500',
      description: 'Guides on using tools'
    },
    {
      id: 'scene',
      name: 'Scene',
      icon: <FileText className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-rose-400 to-pink-500',
      description: 'Creates detailed scenes'
    }
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="py-1 px-1 overflow-hidden bg-[#21283B]/80 border-b border-white/10">
        <div 
          ref={scrollRef}
          className="flex space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 pb-1"
        >
          {agents.map((agent) => (
            <Tooltip key={agent.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(agent.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center py-0.5 px-1.5 rounded-md transition-colors text-xs",
                    selectedAgent === agent.id
                      ? `${agent.color} text-white`
                      : 'bg-[#2D3240]/80 hover:bg-[#3A4256] text-gray-300'
                  )}
                >
                  <span className="mr-1">{agent.icon}</span>
                  <span className="text-[10px]">{agent.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-[#333] border-[#555] text-white">
                {agent.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
