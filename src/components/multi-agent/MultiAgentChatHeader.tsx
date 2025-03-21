
import React from 'react';
import { AgentType, BUILT_IN_AGENT_TYPES } from '@/hooks/use-multi-agent-chat';
import { Button } from '@/components/ui/button';
import { Trash2, Zap, Wrench, GitCompare, Database, Bug } from 'lucide-react';
import { AgentSelector } from './AgentSelector';
import { useCustomAgents } from '@/hooks/use-custom-agents';

interface MultiAgentChatHeaderProps {
  activeAgent: AgentType;
  onSwitchAgent: (agentType: AgentType) => void;
  onClearChat: () => void;
  usePerformanceModel: boolean;
  onTogglePerformanceMode: () => void;
  enableDirectToolExecution: boolean;
  onToggleDirectToolExecution: () => void;
  tracingEnabled: boolean;
  onToggleTracing: () => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
}

export const MultiAgentChatHeader: React.FC<MultiAgentChatHeaderProps> = ({
  activeAgent,
  onSwitchAgent,
  onClearChat,
  usePerformanceModel,
  onTogglePerformanceMode,
  enableDirectToolExecution,
  onToggleDirectToolExecution,
  tracingEnabled,
  onToggleTracing,
  debugMode,
  onToggleDebugMode
}) => {
  const { customAgents } = useCustomAgents();
  
  // Get color based on agent type
  const getAgentColor = (agentType: AgentType): string => {
    switch (agentType) {
      case 'main': return 'bg-blue-600';
      case 'script': return 'bg-amber-600';
      case 'image': return 'bg-purple-600';
      case 'tool': return 'bg-green-600';
      case 'scene': return 'bg-pink-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white">Multi-Agent Chat</h1>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            title="Clear chat"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Trash2 size={16} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <AgentSelector
            activeAgent={activeAgent}
            onSelectAgent={onSwitchAgent}
            className="bg-slate-800 text-sm"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePerformanceMode}
            className={`gap-1 text-xs px-2 ${usePerformanceModel ? 'border-amber-500 text-amber-400' : 'border-slate-700 text-slate-400'}`}
            title={usePerformanceModel ? "Using faster model (lower quality)" : "Using standard model (higher quality)"}
          >
            <Zap size={14} />
            <span className="hidden sm:inline">{usePerformanceModel ? 'Fast' : 'Standard'}</span>
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={onToggleDirectToolExecution}
            className={`gap-1 text-xs px-2 ${enableDirectToolExecution ? 'border-green-500 text-green-400' : 'border-slate-700 text-slate-400'}`}
            title={enableDirectToolExecution ? "Direct tool execution enabled" : "Tool agent handoff required"}
          >
            <Wrench size={14} />
            <span className="hidden sm:inline">Direct Tools</span>
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={onToggleTracing}
            className={`gap-1 text-xs px-2 ${tracingEnabled ? 'border-blue-500 text-blue-400' : 'border-slate-700 text-slate-400'}`}
            title={tracingEnabled ? "Tracing enabled" : "Tracing disabled"}
          >
            <GitCompare size={14} />
            <span className="hidden sm:inline">Tracing</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleDebugMode}
            className={`gap-1 text-xs px-2 ${debugMode ? 'border-red-500 text-red-400' : 'border-slate-700 text-slate-400'}`}
            title={debugMode ? "Debug mode enabled" : "Debug mode disabled"}
          >
            <Bug size={14} />
            <span className="hidden sm:inline">Debug</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
