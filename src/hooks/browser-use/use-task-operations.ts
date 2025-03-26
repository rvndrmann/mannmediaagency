import { useCallback } from "react";
import { BrowserTaskState, StateSetters, TaskStatus } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTaskOperations(state: BrowserTaskState, stateSetters: StateSetters) {
  const {
    taskInput,
    currentTaskId,
    browserConfig
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
  const startTask = useCallback(async (environment: "browser" | "desktop" = "browser") => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      // Validate if desktop mode is selected but own browser isn't enabled
      if (environment === "desktop" && !browserConfig.useOwnBrowser) {
        setError("Desktop mode requires using your own browser.");
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { 
          task: taskInput,
          environment: environment,
          browser_config: browserConfig
        }
      });

      if (error) throw new Error(error.message);
      
      toast.success("Task started successfully");
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
  }, [taskInput, browserConfig, setCurrentTaskId, setIsProcessing, setTaskStatus, setError, setProgress, setLiveUrl]);

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
