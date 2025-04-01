
import { useState, useCallback } from 'react';
import { AgentType } from './runner/types';

type HandoffRecord = {
  from: AgentType;
  to: AgentType;
  reason: string;
  timestamp: string;
};

export function useAgentHistory() {
  const [history, setHistory] = useState<HandoffRecord[]>([]);

  const updateAgentHistory = useCallback((
    fromAgent: AgentType, 
    toAgent: AgentType, 
    reason: string
  ) => {
    setHistory(prev => [
      ...prev,
      {
        from: fromAgent,
        to: toAgent,
        reason,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    updateAgentHistory,
    clearHistory
  };
}
