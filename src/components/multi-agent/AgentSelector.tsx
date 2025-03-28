
import React, { useRef } from 'react';
import { Bot, PenLine, Image, Wrench, FileText, ArrowUp } from 'lucide-react';
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
      description: 'General AI assistant that can help with various tasks',
      icon: 'Bot',
      color: 'from-blue-400 to-indigo-500',
      instructions: 'You are a helpful assistant that can help users with various tasks.',
      type: 'assistant',
      isBuiltIn: true
    },
    {
      id: 'script',
      name: 'Script Writer',
      description: 'Specialized in creating scripts, stories, and narratives',
      icon: 'PenLine',
      color: 'from-amber-400 to-orange-500',
      instructions: 'You are a script writer specialized in creating engaging content.',
      type: 'script',
      isBuiltIn: true
    },
    {
      id: 'image',
      name: 'Image Prompt',
      description: 'Creates detailed prompts for AI image generation',
      icon: 'Image',
      color: 'from-emerald-400 to-green-500',
      instructions: 'You help users create detailed prompts for AI image generation.',
      type: 'image',
      isBuiltIn: true
    },
    {
      id: 'tool',
      name: 'Tool Helper',
      description: 'Guides you in using the right tools for your creative needs',
      icon: 'Wrench',
      color: 'from-purple-400 to-violet-500',
      instructions: 'You help users select the right tools for their creative tasks.',
      type: 'tool',
      isBuiltIn: true
    },
    {
      id: 'scene',
      name: 'Scene Creator',
      description: 'Specialized in detailed scene descriptions for visual content',
      icon: 'FileText',
      color: 'from-rose-400 to-pink-500',
      instructions: 'You help users create vivid scene descriptions for visual content.',
      type: 'scene',
      isBuiltIn: true
    }
  ];

  const renderAgentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot className="h-5 w-5" />;
      case 'PenLine': return <PenLine className="h-5 w-5" />;
      case 'Image': return <Image className="h-5 w-5" />;
      case 'Wrench': return <Wrench className="h-5 w-5" />;
      case 'FileText': return <FileText className="h-5 w-5" />;
      default: return <Bot className="h-5 w-5" />;
    }
  };
  
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col space-y-2 p-2 max-h-[400px]">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`flex items-center p-2 rounded-lg transition-colors ${
              selectedAgentId === agent.id
                ? `bg-gradient-to-r ${agent.color} text-white`
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className={`mr-3 p-2 rounded-full bg-white/10 ${selectedAgentId !== agent.id ? 'text-gray-700 dark:text-gray-300' : ''}`}>
              {renderAgentIcon(agent.icon as string)}
            </div>
            <div className="text-left">
              <div className="font-medium">{agent.name}</div>
              <div className={`text-xs ${selectedAgentId === agent.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {agent.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Scroll to top button */}
      <div className="mt-2 px-2">
        <Button 
          onClick={scrollToTop} 
          variant="ghost" 
          size="sm" 
          className="w-full flex items-center justify-center text-gray-400 hover:text-white"
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          <span>Go to top</span>
        </Button>
      </div>
    </div>
  );
};

export default AgentSelector;
