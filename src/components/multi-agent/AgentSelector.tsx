
import React, { useRef } from 'react';
import { Bot, PenLine, Image, Wrench, FileText, Database } from 'lucide-react';
import { AgentInfo } from '@/types/message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type AgentType } from '@/hooks/use-multi-agent-chat';

interface AgentSelectorProps {
  onSelect: (agentId: AgentType) => void;
  selectedAgentId: AgentType;
  disabled?: boolean;
}

export function AgentSelector({ onSelect, selectedAgentId, disabled = false }: AgentSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Built-in agent definitions with required type and isBuiltIn properties
  const agents: AgentInfo[] = [
    {
      id: 'main',
      name: 'Assistant',
      description: 'General AI assistant',
      icon: 'Bot',
      color: 'from-blue-400 to-indigo-500',
      instructions: 'You are a helpful assistant.',
      type: 'assistant',
      isBuiltIn: true
    },
    {
      id: 'script',
      name: 'Script Writer',
      description: 'Creates scripts and narratives',
      icon: 'PenLine',
      color: 'from-amber-400 to-orange-500',
      instructions: 'You are a script writer.',
      type: 'script',
      isBuiltIn: true
    },
    {
      id: 'image',
      name: 'Image Prompt',
      description: 'Creates AI image prompts',
      icon: 'Image',
      color: 'from-emerald-400 to-green-500',
      instructions: 'You create image prompts.',
      type: 'image',
      isBuiltIn: true
    },
    {
      id: 'data',
      name: 'Data Agent',
      description: 'Extracts & manages media data',
      icon: 'Database',
      color: 'from-cyan-400 to-blue-500',
      instructions: 'You extract and manage data.',
      type: 'data',
      isBuiltIn: true
    },
    {
      id: 'tool',
      name: 'Tool Helper',
      description: 'Guides on using tools',
      icon: 'Wrench',
      color: 'from-purple-400 to-violet-500',
      instructions: 'You help with tools.',
      type: 'tool',
      isBuiltIn: true
    },
    {
      id: 'scene',
      name: 'Scene Creator',
      description: 'Creates detailed scenes',
      icon: 'FileText',
      color: 'from-rose-400 to-pink-500',
      instructions: 'You create scenes.',
      type: 'scene',
      isBuiltIn: true
    }
  ];

  const getAgentIcon = (agentId: string, className: string = "") => {
    switch (agentId) {
      case 'main':
        return <Bot className={className} />;
      case 'script':
        return <PenLine className={className} />;
      case 'image':
        return <Image className={className} />;
      case 'tool':
        return <Wrench className={className} />;
      case 'scene':
        return <FileText className={className} />;
      case 'data':
        return <Database className={className} />;
      default:
        return <Bot className={className} />;
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#21283B]/60 backdrop-blur-sm p-2">
      <div 
        ref={scrollContainerRef} 
        className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700"
      >
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id as AgentType)}
            disabled={disabled}
            className={cn(
              "flex-shrink-0 flex items-center justify-center flex-col py-2 px-3 rounded-lg transition-colors",
              selectedAgentId === agent.id
                ? `bg-gradient-to-r ${agent.color} text-white`
                : 'hover:bg-[#2D3648] text-gray-300',
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={`p-2 rounded-full ${selectedAgentId === agent.id ? 'bg-white/20' : 'bg-[#2A3040]'}`}>
              {getAgentIcon(agent.id, "h-5 w-5")}
            </div>
            <div className="font-medium text-xs mt-1.5">{agent.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AgentSelector;
