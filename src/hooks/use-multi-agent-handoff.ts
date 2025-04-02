
import { useState, useCallback } from 'react';

// Define the proper HandoffRequest type
export interface HandoffRequest {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface HandoffRequestsState {
  [key: string]: HandoffRequest;
}

export function useMultiAgentHandoff() {
  const [handoffRequests, setHandoffRequests] = useState<HandoffRequestsState>({});
  const [activeHandoffId, setActiveHandoffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHandoffRequest = useCallback((type: string, data?: any) => {
    const id = `handoff-${Date.now()}`;
    const now = new Date();
    
    const newRequest: HandoffRequest = {
      id,
      type,
      status: 'pending',
      data,
      createdAt: now,
      updatedAt: now
    };
    
    setHandoffRequests((prev) => ({
      ...prev,
      [id]: newRequest
    }));
    
    return id;
  }, []);

  const updateHandoffStatus = useCallback((handoffId: string, status: HandoffRequest['status'], result?: any, error?: string) => {
    setHandoffRequests((prev) => {
      if (!prev[handoffId]) {
        return prev;
      }
      
      return {
        ...prev,
        [handoffId]: {
          ...prev[handoffId],
          status,
          result,
          error,
          updatedAt: new Date()
        }
      };
    });
  }, []);

  const startHandoff = useCallback(async (type: string, data?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Handoff] Starting handoff:', { type, data }); // <-- Add log here
      const handoffId = createHandoffRequest(type, data);
      setActiveHandoffId(handoffId);
      
      // Update status to in_progress
      updateHandoffStatus(handoffId, 'in_progress');
      
      // Here you would typically call an API or service to perform the handoff
      // For now, we'll simulate a successful handoff after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update with success
      updateHandoffStatus(handoffId, 'completed', { message: 'Handoff successful' });
      
      return {
        success: true,
        handoffId,
        result: { message: 'Handoff successful' }
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      if (activeHandoffId) {
        updateHandoffStatus(activeHandoffId, 'failed', undefined, errorMessage);
      }
      
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [createHandoffRequest, updateHandoffStatus, activeHandoffId]);

  const cancelHandoff = useCallback((handoffId: string) => {
    setHandoffRequests((prev) => {
      if (!prev[handoffId]) {
        return prev;
      }
      
      return {
        ...prev,
        [handoffId]: {
          ...prev[handoffId],
          status: 'failed',
          error: 'Handoff cancelled by user',
          updatedAt: new Date()
        }
      };
    });
    
    if (activeHandoffId === handoffId) {
      setActiveHandoffId(null);
    }
  }, [activeHandoffId]);

  const getHandoffStatus = useCallback((handoffId: string) => {
    return handoffRequests[handoffId]?.status || null;
  }, [handoffRequests]);

  return {
    handoffRequests,
    activeHandoffId,
    loading,
    error,
    createHandoffRequest,
    updateHandoffStatus,
    startHandoff,
    cancelHandoff,
    getHandoffStatus
  };
}

export default useMultiAgentHandoff;
