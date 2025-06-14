
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { BrowserAutomationAdapter, BrowserAutomationConfig, BrowserAutomationResult } from './browser-automation-adapter';

export interface UseBrowserAutomationResult {
  isLoading: boolean;
  currentTask: BrowserAutomationResult | null;
  submitTask: (task: string, config?: BrowserAutomationConfig) => Promise<void>;
  getTaskStatus: (taskId: string) => Promise<BrowserAutomationResult>;
  stopTask: (taskId: string) => Promise<void>;
  error: string | null;
}

export const useBrowserAutomation = (): UseBrowserAutomationResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<BrowserAutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const adapter = new BrowserAutomationAdapter();

  const submitTask = useCallback(async (task: string, config?: BrowserAutomationConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await adapter.submitTask(task, config);
      setCurrentTask(result);
      
      toast.success('Browser automation task submitted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskStatus = useCallback(async (taskId: string): Promise<BrowserAutomationResult> => {
    try {
      setError(null);
      const result = await adapter.getTaskStatus(taskId);
      
      if (currentTask?.taskId === taskId) {
        setCurrentTask(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get task status';
      setError(errorMessage);
      throw err;
    }
  }, [currentTask]);

  const stopTask = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await adapter.stopTask(taskId);
      
      if (currentTask?.taskId === taskId) {
        setCurrentTask({ ...currentTask, status: 'stopped' });
      }
      
      toast.success('Task stopped successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentTask]);

  return {
    isLoading,
    currentTask,
    submitTask,
    getTaskStatus,
    stopTask,
    error,
  };
};
