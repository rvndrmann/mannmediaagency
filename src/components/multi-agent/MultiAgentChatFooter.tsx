
import React from 'react';
import { AgentType } from '@/hooks/use-multi-agent-chat';
import { CircleDollarSign } from 'lucide-react';

interface MultiAgentChatFooterProps {
  activeAgent: AgentType;
  creditsRemaining?: number;
}

export const MultiAgentChatFooter: React.FC<MultiAgentChatFooterProps> = ({ 
  activeAgent,
  creditsRemaining
}) => {
  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
      <div>
        Active agent: <span className="font-medium text-slate-300">{activeAgent}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <CircleDollarSign size={14} />
        <span>
          {creditsRemaining !== undefined 
            ? `${creditsRemaining.toFixed(2)} credits remaining` 
            : 'Credits loading...'}
        </span>
      </div>
    </div>
  );
};
