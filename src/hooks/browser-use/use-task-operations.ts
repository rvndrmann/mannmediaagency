import { useCallback } from "react";
import { BrowserTaskState, StateSetters, TaskStatus } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTaskOperations(state: BrowserTaskState, stateSetters: StateSetters) {
  const {
    taskInput,
    currentTaskId,
    browserConfig,
    environment
  } = state;

  const {
    setCurrentTaskId,
    setIsProcessing,
    setTaskStatus,
    setError,
    setProgress,
    setLiveUrl
  } = stateSetters;

  // Start a new task
  const startTask = useCallback(async (taskEnvironment?: 'browser' | 'desktop') => {
    const selectedEnvironment = taskEnvironment || environment;
    
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      // Validate if desktop mode is selected but own browser isn't enabled
      if (selectedEnvironment === "desktop" && !browserConfig.useOwnBrowser) {
        setError("Desktop mode requires using your own browser.");
        toast.error("Desktop mode requires using your own browser. Please enable it in the Settings tab.");
        setIsProcessing(false);
        return;
      }
      
      // If desktop mode, make additional validations
      if (selectedEnvironment === "desktop") {
        if (!browserConfig.chromePath) {
          setError("Chrome executable path is required for desktop automation.");
          toast.error("Chrome executable path is required for desktop automation.");
          setIsProcessing(false);
          return;
        }
        
        // Ensure not in headless mode for desktop automation
        if (browserConfig.headless) {
          toast.warning("Desktop automation works best with headless mode disabled");
        }
      }

      console.log(`Starting task in ${selectedEnvironment} environment`);

      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { 
          task: taskInput,
          environment: selectedEnvironment,
          browser_config: browserConfig
        }
      });

      if (error) throw new Error(error.message);
      
      toast.success(`${selectedEnvironment.charAt(0).toUpperCase() + selectedEnvironment.slice(1)} task started successfully`);
      setCurrentTaskId(data.taskId);
      setTaskStatus('created');
      setProgress(10);
      setLiveUrl(data.liveUrl || null);
      
    } catch (error) {
      toast.error("Failed to start task: " + (error instanceof Error ? error.message : "Unknown error"));
      console.error("Error starting task:", error);
      setError(error instanceof Error ? error.message : "Failed to start task");
      setIsProcessing(false);
    }
  }, [taskInput, browserConfig, environment, setCurrentTaskId, setIsProcessing, setTaskStatus, setError, setProgress, setLiveUrl]);

  // Pause the current task
  const pauseTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No task is currently running");
      return;
    }

    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "pause", taskId: currentTaskId }
      });

      if (error) throw new Error(error.message);

      toast.success("Task paused successfully");
      setTaskStatus('paused');
    } catch (error) {
      toast.error("Failed to pause task: " + (error instanceof Error ? error.message : "Unknown error"));
      setError(error instanceof Error ? error.message : "Failed to pause task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, setIsProcessing, setTaskStatus, setError]);

  // Resume a paused task
  const resumeTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No task is currently paused");
      return;
    }

    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "resume", taskId: currentTaskId }
      });

      if (error) throw new Error(error.message);

      toast.success("Task resumed successfully");
      setTaskStatus('running');
    } catch (error) {
      toast.error("Failed to resume task: " + (error instanceof Error ? error.message : "Unknown error"));
      setError(error instanceof Error ? error.message : "Failed to resume task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, setIsProcessing, setTaskStatus, setError]);

  // Stop the current task
  const stopTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No task is currently running");
      return;
    }

    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "stop", taskId: currentTaskId }
      });

      if (error) throw new Error(error.message);

      toast.success("Task stopped successfully");
      setTaskStatus('stopped');
    } catch (error) {
      toast.error("Failed to stop task: " + (error instanceof Error ? error.message : "Unknown error"));
      setError(error instanceof Error ? error.message : "Failed to stop task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, setIsProcessing, setTaskStatus, setError]);

  // Restart a task
  const restartTask = useCallback(async () => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    if (!currentTaskId) {
      toast.error("No task is currently selected");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setTaskStatus('pending');

      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { 
          action: "restart",
          taskId: currentTaskId,
          task: taskInput,
          browser_config: browserConfig
        }
      });

      if (error) throw new Error(error.message);

      toast.success("Task restarted successfully");
      setTaskStatus('created');
      setProgress(10);
    } catch (error) {
      toast.error("Failed to restart task: " + (error instanceof Error ? error.message : "Unknown error"));
      setError(error instanceof Error ? error.message : "Failed to restart task");
    } finally {
      setIsProcessing(false);
    }
  }, [taskInput, currentTaskId, browserConfig, setIsProcessing, setProgress, setError, setTaskStatus]);
  
  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask
  };
}
