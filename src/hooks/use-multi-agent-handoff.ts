
import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/types/message';
import type { AgentType } from '@/hooks/use-multi-agent-chat';

export interface HandoffRequest {
  id: string;
  fromAgent: AgentType;
  targetAgent: AgentType;
  reason?: string;
  additionalContext?: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
}

interface UseMultiAgentHandoffOptions {
  projectId?: string;
  sessionId?: string;
  onHandoffComplete?: (handoffId: string, fromAgent: AgentType, targetAgent: AgentType) => void;
  onHandoffFailed?: (handoffId: string, error: Error) => void;
}

export function useMultiAgentHandoff(options: UseMultiAgentHandoffOptions = {}) {
  const { projectId, sessionId, onHandoffComplete, onHandoffFailed } = options;
  const [handoffs, setHandoffs] = useLocalStorage<Record<string, HandoffRequest>>(
    `agent-handoffs-${sessionId || 'global'}`,
    {}
  );
  const [currentHandoff, setCurrentHandoff] = useState<HandoffRequest | null>(null);
  const [isProcessingHandoff, setIsProcessingHandoff] = useState(false);
  
  // Add a handoff request to the queue
  const requestHandoff = useCallback((
    fromAgent: AgentType,
    targetAgent: AgentType,
    reason?: string,
    additionalContext?: Record<string, any>
  ): HandoffRequest => {
    const handoffId = uuidv4();
    const handoffRequest: HandoffRequest = {
      id: handoffId,
      fromAgent,
      targetAgent,
      reason,
      additionalContext,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    setHandoffs(prev => ({
      ...prev,
      [handoffId]: handoffRequest
    }));
    
    console.log(`Handoff requested: ${fromAgent} -> ${targetAgent}`, handoffRequest);
    
    return handoffRequest;
  }, [setHandoffs]);
  
  // Process a handoff from the queue
  const processHandoff = useCallback(async (
    handoffId: string,
    messages: Message[]
  ): Promise<any> => {
    const handoff = handoffs[handoffId];
    
    if (!handoff) {
      console.error(`No handoff found with ID: ${handoffId}`);
      return null;
    }
    
    // Update status to processing
    setHandoffs(prev => ({
      ...prev,
      [handoffId]: {
        ...prev[handoffId],
        status: 'processing'
      }
    }));
    
    setCurrentHandoff(handoff);
    setIsProcessingHandoff(true);
    
    try {
      console.log(`Processing handoff ${handoffId}: ${handoff.fromAgent} -> ${handoff.targetAgent}`);
      
      // This is a simplified handoff process - in a real app, this would make a server request
      // or use an edge function to handle the handoff between agents
      
      // Record the handoff in the database if we're authenticated and have session ID
      if (sessionId) {
        const { error } = await supabase.functions.invoke('multi-agent-chat', {
          body: {
            operation: 'agent_handoff',
            sessionId,
            projectId,
            handoffId,
            fromAgent: handoff.fromAgent,
            targetAgent: handoff.targetAgent,
            reason: handoff.reason,
            additionalContext: handoff.additionalContext,
            messages: messages.slice(-10) // Only send the last 10 messages to reduce payload
          },
        });
        
        if (error) {
          throw new Error(`Handoff error: ${error.message}`);
        }
      }
      
      // Update handoff status to complete
      setHandoffs(prev => ({
        ...prev,
        [handoffId]: {
          ...prev[handoffId],
          status: 'complete'
        }
      }));
      
      // Call the callback if provided
      if (onHandoffComplete) {
        onHandoffComplete(handoffId, handoff.fromAgent, handoff.targetAgent);
      }
      
      // Short delay for UI purposes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        handoffId,
        fromAgent: handoff.fromAgent,
        targetAgent: handoff.targetAgent
      };
    } catch (error) {
      console.error(`Handoff processing error:`, error);
      
      // Update handoff status to failed
      setHandoffs(prev => ({
        ...prev,
        [handoffId]: {
          ...prev[handoffId],
          status: 'failed'
        }
      }));
      
      // Call the failure callback if provided
      if (onHandoffFailed && error instanceof Error) {
        onHandoffFailed(handoffId, error);
      }
      
      toast.error(`Agent handoff failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsProcessingHandoff(false);
      setCurrentHandoff(null);
    }
  }, [handoffs, setHandoffs, projectId, sessionId, onHandoffComplete, onHandoffFailed]);
  
  // Get all handoffs for the current session
  const getHandoffs = useCallback(() => {
    return Object.values(handoffs);
  }, [handoffs]);
  
  // Get a specific handoff by ID
  const getHandoff = useCallback((handoffId: string) => {
    return handoffs[handoffId] || null;
  }, [handoffs]);
  
  // Clear completed handoffs older than a specific time
  useEffect(() => {
    const clearOldHandoffs = () => {
      const now = new Date();
      const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
      
      setHandoffs(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([id, handoff]) => {
          const handoffDate = new Date(handoff.timestamp);
          if (handoff.status === 'complete' && handoffDate < oneDayAgo) {
            delete updated[id];
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    };
    
    // Clear old handoffs on mount
    clearOldHandoffs();
    
    // Set up interval to clear old handoffs
    const interval = setInterval(clearOldHandoffs, 1000 * 60 * 60); // Every hour
    
    return () => clearInterval(interval);
  }, [setHandoffs]);
  
  return {
    requestHandoff,
    processHandoff,
    getHandoffs,
    getHandoff,
    currentHandoff,
    isProcessingHandoff
  };
}
