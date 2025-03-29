
import React from 'react';
import { Bot, PenLine, Image, Wrench, FileText, Database } from 'lucide-react';
import { type AgentType } from '@/hooks/use-multi-agent-chat';
import { getAgentIcon } from '@/lib/agent-icons';

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelect: (agentId: AgentType) => void;
}

export const CompactAgentSelector: React.FC<CompactAgentSelectorProps> = ({ 
  selectedAgent, 
  onSelect 
}) => {
  const agents: { id: AgentType; name: string; color: string }[] = [
    {
      id: 'main',
      name: 'Assistant',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      id: 'script',
      name: 'Script',
      color: 'from-amber-400 to-orange-500'
    },
    {
      id: 'scene',
      name: 'Scene',
      color: 'from-rose-400 to-pink-500'
    },
    {
      id: 'image',
      name: 'Image',
      color: 'from-emerald-400 to-green-500'
    },
    {
      id: 'tool',
      name: 'Tools',
      color: 'from-purple-400 to-violet-500'
    }
  ];

  return (
    <div className="border-b border-white/10 py-1 px-2 flex space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
            selectedAgent === agent.id
              ? `bg-gradient-to-r ${agent.color} text-white`
              : 'hover:bg-[#2D3648] text-gray-300'
          }`}
        >
          <span className="flex-shrink-0">
            {getAgentIcon(agent.id, "h-3.5 w-3.5")}
          </span>
          <span className="font-medium">{agent.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CompactAgentSelector;
