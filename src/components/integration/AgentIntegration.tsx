
import React, { useEffect, useState } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useMultiAgent } from '@/contexts/MultiAgentContext';
import { ErrorBoundary } from './ErrorBoundary';

interface AgentIntegrationProps {
  projectId: string;
  sceneId?: string;
  children: React.ReactNode;
}

export function AgentIntegration({ projectId, sceneId, children }: AgentIntegrationProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Only attempt to use contexts when they're available
  const canvasContext = React.useContext(React.createContext<any>(null));
  const multiAgentContext = React.useContext(React.createContext<any>(null));
  
  // Error handling
  useEffect(() => {
    if (canvasContext?.error) {
      setError(`Canvas error: ${canvasContext.error}`);
    } else if (multiAgentContext?.error) {
      setError(`MultiAgent error: ${multiAgentContext.error}`);
    } else {
      setError(null);
    }
  }, [canvasContext?.error, multiAgentContext?.error]);
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Integration Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          onClick={() => setError(null)}
        >
          Dismiss
        </button>
      </div>
    );
  }
  
  return (
    <ErrorBoundary fallback={<div className="p-4">Something went wrong with the agent integration. Please try again.</div>}>
      {children}
    </ErrorBoundary>
  );
}
