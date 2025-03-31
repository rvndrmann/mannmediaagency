
import { useState, useCallback } from "react";
import { BrowserAgentService, BrowserAutomationTask } from "./BrowserAgentService";

export function useBrowserAutomation() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [taskOutput, setTaskOutput] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const browserService = BrowserAgentService.getInstance();
  
  /**
   * Run a browser automation task
   */
  const runTask = useCallback(async (
    task: string, 
    options = { save_browser_data: true }
  ) => {
    setIsRunning(true);
    setError(null);
    
    try {
      const taskId = await browserService.runTask(task, options);
      setCurrentTaskId(taskId);
      setTaskStatus('created');
      
      // Start polling for task status
      pollTaskStatus(taskId);
      
      return taskId;
    } catch (err) {
      setError(err as Error);
      setIsRunning(false);
      throw err;
    }
  }, []);
  
  /**
   * Poll for task status updates
   */
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const checkStatus = async () => {
        const task = await browserService.getTask(taskId);
        setTaskStatus(task.status);
        
        if (task.output) {
          setTaskOutput(task.output);
        }
        
        if (task.status === 'finished' || task.status === 'failed' || task.status === 'stopped') {
          setIsRunning(false);
          
          // If task is finished, get media
          if (task.status === 'finished') {
            try {
              await browserService.getTaskMedia(taskId);
            } catch (mediaErr) {
              console.error("Failed to get task media:", mediaErr);
            }
          }
          
          return;
        }
        
        // Continue polling every 3 seconds
        setTimeout(checkStatus, 3000);
      };
      
      // Start the polling
      setTimeout(checkStatus, 1000);
    } catch (err) {
      console.error("Error polling task status:", err);
      setError(err as Error);
      setIsRunning(false);
    }
  }, []);
  
  /**
   * Stop the current task
   */
  const stopTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    try {
      await browserService.stopTask(currentTaskId);
      setTaskStatus('stopped');
      setIsRunning(false);
    } catch (err) {
      setError(err as Error);
    }
  }, [currentTaskId]);
  
  /**
   * Pause the current task
   */
  const pauseTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    try {
      await browserService.pauseTask(currentTaskId);
      setTaskStatus('paused');
    } catch (err) {
      setError(err as Error);
    }
  }, [currentTaskId]);
  
  /**
   * Resume the current task
   */
  const resumeTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    try {
      await browserService.resumeTask(currentTaskId);
      setTaskStatus('running');
    } catch (err) {
      setError(err as Error);
    }
  }, [currentTaskId]);
  
  /**
   * Get available credits
   */
  const getAvailableCredits = useCallback(async () => {
    try {
      return await browserService.getBalance();
    } catch (err) {
      setError(err as Error);
      return 0;
    }
  }, []);
  
  return {
    isRunning,
    taskStatus,
    taskOutput,
    error,
    runTask,
    stopTask,
    pauseTask,
    resumeTask,
    getAvailableCredits
  };
}
