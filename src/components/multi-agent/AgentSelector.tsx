
import React, { useRef } from 'react';
import { Bot, PenLine, Image, Wrench, FileText } from 'lucide-react';
import { AgentInfo } from '@/types/message';
import { Button } from '@/components/ui/button';

interface AgentSelectorProps {
  onSelect: (agentId: string) => void;
  selectedAgentId: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ onSelect, selectedAgentId }) => {
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

  const renderAgentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot className="h-4 w-4" />;
      case 'PenLine': return <PenLine className="h-4 w-4" />;
      case 'Image': return <Image className="h-4 w-4" />;
      case 'Wrench': return <Wrench className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="py-2 overflow-hidden">
      <div 
        ref={scrollContainerRef} 
        className="flex space-x-2 px-2 overflow-x-auto pb-2 scrollbar-thin"
      >
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`flex-shrink-0 flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              selectedAgentId === agent.id
                ? `bg-gradient-to-r ${agent.color} text-white`
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className={`p-2 rounded-full bg-white/10 ${selectedAgentId !== agent.id ? 'text-gray-700 dark:text-gray-300' : ''}`}>
              {renderAgentIcon(agent.icon as string)}
            </div>
            <div className="font-medium text-xs mt-1">{agent.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AgentSelector;
