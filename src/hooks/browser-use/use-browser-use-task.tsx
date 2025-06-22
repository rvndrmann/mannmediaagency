
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrowserUseTaskResult {
  isLoading: boolean;
  taskStatus: 'created' | 'running' | 'finished' | 'stopped' | 'paused' | 'failed' | null;
  liveUrl: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  progress: number;
  error: string | null;
  taskOutput: string | null;
  currentTaskId: string | null;
  submitTask: (taskInput: string, userId: string) => Promise<void>;
  pauseTask: () => Promise<void>;
  resumeTask: () => Promise<void>;
  stopTask: () => Promise<void>;
}

export const useBrowserUseTask = (): BrowserUseTaskResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'created' | 'running' | 'finished' | 'stopped' | 'paused' | 'failed' | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [taskOutput, setTaskOutput] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const submitTask = useCallback(async (taskInput: string, userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('browser-use-submit-task', {
        body: { task: taskInput, userId }
      });

      if (error) throw error;
      
      if (data?.taskId) {
        setCurrentTaskId(data.taskId);
        setTaskStatus('created');
        setLiveUrl(data.liveUrl || null);
        toast.success('Task submitted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pauseTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error('No active task to pause');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('browser-use-pause-task', {
        body: { taskId: currentTaskId }
      });

      if (error) throw error;
      
      setTaskStatus('paused');
      toast.success('Task paused');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId]);

  const resumeTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error('No task to resume');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('browser-use-resume-task', {
        body: { taskId: currentTaskId }
      });

      if (error) throw error;
      
      setTaskStatus('running');
      toast.success('Task resumed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId]);

  const stopTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error('No task to stop');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('browser-use-stop-task', {
        body: { taskId: currentTaskId }
      });

      if (error) throw error;
      
      setTaskStatus('stopped');
      setCurrentTaskId(null);
      toast.success('Task stopped');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId]);

  return {
    isLoading,
    taskStatus,
    liveUrl,
    connectionStatus,
    progress,
    error,
    taskOutput,
    currentTaskId,
    submitTask,
    pauseTask,
    resumeTask,
    stopTask,
  };
};
