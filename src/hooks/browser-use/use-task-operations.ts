import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BrowserTask, BrowserConfig, TaskStatus, TaskStep, BrowserTaskState } from './types';

export interface UseTaskOperationsResult {
  currentTask: BrowserTask | null;
  taskState: BrowserTaskState;
  isProcessing: boolean;
  error: string | null;
  startNewTask: (taskInput: string, config: BrowserConfig) => Promise<void>;
  getTaskStatus: (taskId: string) => Promise<void>;
  pauseTask: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  captureScreenshot: (taskId: string) => Promise<void>;
  restartTask: (taskId: string, taskInput: string, config: BrowserConfig) => Promise<void>;
  resetState: () => void;
  setIsProcessing: (processing: boolean) => void;
}

export const useTaskOperations = (): UseTaskOperationsResult => {
  const [currentTask, setCurrentTask] = useState<BrowserTask | null>(null);
  const [taskState, setTaskState] = useState<BrowserTaskState>({
    taskId: '',
    status: 'created',
    progress: 0,
    steps: [],
    connectionStatus: 'disconnected',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNewTask = useCallback(async (
    taskInput: string,
    config: BrowserConfig
  ) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/submit-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskInput, config }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit task');
      }

      const result = await response.json();
      
      setCurrentTask({
        ...result,
        status: 'created' as TaskStatus, // Use 'created' instead of 'pending'
      });
      
      setTaskState({
        taskId: result.id,
        status: 'created',
        progress: 0,
        steps: [],
        connectionStatus: 'connecting',
      });
      
      toast.success('Browser automation task submitted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getTaskStatus = useCallback(async (taskId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/browser-automation/task-status?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get task status');
      }

      const result = await response.json();
      
      setCurrentTask(prevTask => prevTask ? { ...prevTask, ...result } : result);
      
      setTaskState(prev => ({
        ...prev,
        status: result.status as TaskStatus,
        progress: result.progress || prev.progress,
        steps: result.steps || prev.steps,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get task status';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const pauseTask = useCallback(async (taskId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/pause-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to pause task');
      }
      
      setTaskState(prev => ({
        ...prev,
        status: 'paused',
      }));
      
      toast.success('Task paused successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resumeTask = useCallback(async (taskId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/resume-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resume task');
      }
      
      setTaskState(prev => ({
        ...prev,
        status: 'running',
      }));
      
      toast.success('Task resumed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopTask = useCallback(async (taskId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/stop-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop task');
      }
      
      setTaskState(prev => ({
        ...prev,
        status: 'stopped',
      }));
      
      toast.success('Task stopped successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const captureScreenshot = useCallback(async (taskId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/capture-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to capture screenshot');
      }
      
      const result = await response.json();
      
      setCurrentTask(prevTask => prevTask ? { ...prevTask, screenshot_url: result.screenshot_url } : { ...result, screenshot_url: result.screenshot_url });
      
      toast.success('Screenshot captured successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const restartTask = useCallback(async (taskId: string, taskInput: string, config: BrowserConfig) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/browser-automation/restart-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, taskInput, config }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart task');
      }
      
      const result = await response.json();
      
      setCurrentTask({
        ...result,
        status: 'created' as TaskStatus,
      });
      
      setTaskState({
        taskId: result.id,
        status: 'created',
        progress: 0,
        steps: [],
        connectionStatus: 'connecting',
      });
      
      toast.success('Task restarted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setCurrentTask(null);
    setTaskState({
      taskId: '',
      status: 'created',
      progress: 0,
      steps: [],
      connectionStatus: 'disconnected',
    });
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    currentTask,
    taskState,
    isProcessing,
    error,
    startNewTask,
    getTaskStatus,
    pauseTask,
    resumeTask,
    stopTask,
    captureScreenshot,
    restartTask,
    resetState,
    setIsProcessing,
  };
};
