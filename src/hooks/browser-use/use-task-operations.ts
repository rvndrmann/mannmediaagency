
import { useCallback } from "react";
import { toast } from "sonner";
import { BrowserTaskState, StateSetters } from "./types";
import { supabase } from "@/integrations/supabase/client";

export function useTaskOperations(
  state: BrowserTaskState,
  stateSetters: StateSetters
) {
  const { 
    taskInput, 
    currentTaskId, 
    browserConfig, 
    environment 
  } = state;
  
  const { 
    setCurrentTaskId, 
    setIsProcessing, 
    setProgress, 
    setTaskSteps, 
    setTaskOutput, 
    setTaskStatus, 
    setCurrentUrl, 
    setError, 
    setLiveUrl,
    setConnectionStatus
  } = stateSetters;
  
  const resetTaskState = useCallback(() => {
    setProgress(0);
    setTaskSteps([]);
    setTaskOutput(null);
    setCurrentUrl(null);
    setError(null);
    setLiveUrl(null);
  }, [setProgress, setTaskSteps, setTaskOutput, setCurrentUrl, setError, setLiveUrl]);
  
  const validateDesktopConfiguration = useCallback(() => {
    if (environment !== 'desktop') return true;
    
    // Check for any connection method
    const hasConnectionMethod = 
      browserConfig.wssUrl || 
      browserConfig.cdpUrl || 
      browserConfig.browserInstancePath ||
      (browserConfig.useOwnBrowser && browserConfig.chromePath);
    
    if (!hasConnectionMethod) {
      toast.error("Desktop mode requires a connection method. Please configure it in Settings tab.");
      setError("Desktop mode requires a connection method. Please configure it in Settings tab.");
      return false;
    }
    
    // If using local Chrome or browser instance, ensure useOwnBrowser is enabled
    if ((browserConfig.browserInstancePath || browserConfig.chromePath) && !browserConfig.useOwnBrowser) {
      toast.error("When using local Chrome or browser instance, 'useOwnBrowser' must be enabled.");
      setError("When using local Chrome or browser instance, 'useOwnBrowser' must be enabled.");
      return false;
    }
    
    return true;
  }, [browserConfig, environment, setError]);
  
  const startTask = useCallback(async (envType: 'browser' | 'desktop' = 'browser') => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    // Validate desktop configuration if applicable
    if (envType === 'desktop' && !validateDesktopConfiguration()) {
      return;
    }
    
    try {
      setIsProcessing(true);
      setTaskStatus('pending');
      setConnectionStatus('connecting');
      resetTaskState();
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          task: taskInput,
          environment: envType,
          browser_config: browserConfig
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data || !data.taskId) {
        throw new Error("Failed to start task: No task ID received");
      }
      
      setCurrentTaskId(data.taskId);
      setTaskStatus('created');
      setLiveUrl(data.liveUrl || null);
      
      toast.success(`${envType.charAt(0).toUpperCase() + envType.slice(1)} task started successfully`);
      
    } catch (error) {
      console.error("Error starting task:", error);
      setIsProcessing(false);
      setTaskStatus('idle');
      setConnectionStatus('error');
      setError(error instanceof Error ? error.message : "Failed to start task");
      toast.error(error instanceof Error ? error.message : "Failed to start task");
    }
  }, [
    taskInput, 
    browserConfig, 
    setIsProcessing, 
    setTaskStatus, 
    resetTaskState, 
    setCurrentTaskId,
    setLiveUrl,
    setError,
    setConnectionStatus,
    validateDesktopConfiguration
  ]);
  
  const stopTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No active task to stop");
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "stop",
          taskId: currentTaskId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setTaskStatus('stopped');
      toast.success("Task stopped successfully");
      
    } catch (error) {
      console.error("Error stopping task:", error);
      setError(error instanceof Error ? error.message : "Failed to stop task");
      toast.error(error instanceof Error ? error.message : "Failed to stop task");
    }
  }, [currentTaskId, setTaskStatus, setError]);
  
  const pauseTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No active task to pause");
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "pause",
          taskId: currentTaskId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setTaskStatus('paused');
      toast.success("Task paused successfully");
      
    } catch (error) {
      console.error("Error pausing task:", error);
      setError(error instanceof Error ? error.message : "Failed to pause task");
      toast.error(error instanceof Error ? error.message : "Failed to pause task");
    }
  }, [currentTaskId, setTaskStatus, setError]);
  
  const resumeTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No active task to resume");
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "resume",
          taskId: currentTaskId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setTaskStatus('running');
      toast.success("Task resumed successfully");
      
    } catch (error) {
      console.error("Error resuming task:", error);
      setError(error instanceof Error ? error.message : "Failed to resume task");
      toast.error(error instanceof Error ? error.message : "Failed to resume task");
    }
  }, [currentTaskId, setTaskStatus, setError]);
  
  const restartTask = useCallback(() => {
    // Just start a new task with the same input
    startTask(environment);
  }, [startTask, environment]);
  
  return {
    startTask,
    stopTask,
    pauseTask,
    resumeTask,
    restartTask
  };
}
