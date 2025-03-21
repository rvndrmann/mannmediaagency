
import React from 'react';
import { AgentType, BUILT_IN_AGENT_TYPES } from '@/hooks/use-multi-agent-chat';
import { useCustomAgents } from '@/hooks/use-custom-agents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PenLine, Image, Wrench, Code, 
  Bot, FileText, Zap, Brain, 
  Lightbulb, Music 
} from 'lucide-react';

export interface AgentSelectorProps {
  activeAgent: AgentType;
  onSelectAgent: (agentType: AgentType) => void;
  className?: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  activeAgent,
  onSelectAgent,
  className = ''
}) => {
  const { customAgents } = useCustomAgents();

  // Get agent icon based on type
  const getAgentIcon = (agentType: AgentType) => {
    switch (agentType) {
      case 'main': return <Bot size={16} />;
      case 'script': return <PenLine size={16} />;
      case 'image': return <Image size={16} />;
      case 'tool': return <Wrench size={16} />;
      case 'scene': return <Zap size={16} />;
      default: return <Bot size={16} />;
    }
  };
  
  // Get color based on agent type
  const getAgentColor = (agentType: AgentType): string => {
    switch (agentType) {
      case 'main': return 'text-blue-500';
      case 'script': return 'text-amber-500';
      case 'image': return 'text-purple-500';
      case 'tool': return 'text-green-500';
      case 'scene': return 'text-pink-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <Select value={activeAgent} onValueChange={onSelectAgent}>
      <SelectTrigger className={`w-[130px] ${className}`}>
        <SelectValue placeholder="Select Agent" />
      </SelectTrigger>
      <SelectContent>
        {BUILT_IN_AGENT_TYPES.map((agentType) => (
          <SelectItem key={agentType} value={agentType}>
            <div className="flex items-center gap-2">
              <span className={getAgentColor(agentType)}>{getAgentIcon(agentType)}</span>
              <span className="capitalize">{agentType}</span>
            </div>
          </SelectItem>
        ))}
        
        {customAgents && customAgents.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs text-slate-500">Custom Agents</div>
            {customAgents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500"><Bot size={16} /></span>
                  <span>{agent.name}</span>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};
