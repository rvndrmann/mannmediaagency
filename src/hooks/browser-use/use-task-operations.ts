
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState } from "./types";
import { toast } from "sonner";
import { useTaskHistory } from "./use-task-history";
import { v4 as uuidv4 } from "uuid";

interface TaskStateSetters {
  setTaskInput: (value: string) => void;
  setCurrentTaskId: (value: string | null) => void;
  setBrowserTaskId: (value: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setProgress: (value: number) => void;
  setTaskSteps: (value: any[]) => void;
  setTaskOutput: (value: string | null) => void;
  setTaskStatus: (value: string) => void;
  setCurrentUrl: (value: string | null) => void;
  setUserCredits: (value: any) => void;
  setError: (value: string | null) => void;
  setBrowserConfig: (value: any) => void;
  setLiveUrl: (value: string | null) => void;
  setConnectionStatus: (value: BrowserTaskState["connectionStatus"]) => void;
}

export function useTaskOperations(
  state: BrowserTaskState,
  stateSetters: TaskStateSetters
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { saveTaskToHistory, updateTaskHistory } = useTaskHistory();
  
  const {
    setCurrentTaskId, 
    setIsProcessing, 
    setTaskStatus, 
    setTaskOutput,
    setLiveUrl,
    setError,
    setBrowserTaskId
  } = stateSetters;
  
  const { taskInput, browserConfig } = state;
  
  const startTask = useCallback(async () => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsProcessing(true);
      setTaskStatus('pending');
      setError(null);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("You must be logged in to use this feature");
      }
      
      const localTaskId = uuidv4();
      setCurrentTaskId(localTaskId);
      
      console.log("Starting task with input:", taskInput);
      console.log("Using browser config:", browserConfig);
      
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: taskInput,
          browser_config: browserConfig,
          save_browser_data: true,
          user_id: userData.user.id
        }
      });
      
      if (error || data.error) {
        throw new Error(error?.message || data?.error || "Failed to start task");
      }
      
      console.log("Task started successfully:", data);
      
      const taskId = data.task_id;
      setBrowserTaskId(taskId);
      
      if (data.live_url) {
        setLiveUrl(data.live_url);
      }
      
      // Save task to history
      saveTaskToHistory({
        task_input: taskInput,
        status: data.status || 'created',
        user_id: userData.user.id,
        browser_task_id: taskId,
        result_url: data.live_url || null
      });
      
      // Push the current task to browser history
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('task_id', taskId);
      
      // Update the URL without refreshing the page
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      
      // Save to local storage for persistence across page loads
      localStorage.setItem('workerAI_currentTaskId', taskId);
      localStorage.setItem('workerAI_lastTaskInput', taskInput);
      
      toast.success("Task started");
      
      return taskId;
    } catch (error) {
      console.error("Error starting task:", error);
      setIsProcessing(false);
      setTaskStatus('idle');
      setError(error instanceof Error ? error.message : "Unknown error starting task");
      toast.error(error instanceof Error ? error.message : "Failed to start task");
    } finally {
      setIsSubmitting(false);
    }
  }, [taskInput, browserConfig, setCurrentTaskId, setIsProcessing, setTaskStatus, setError, setBrowserTaskId, setLiveUrl, saveTaskToHistory]);
  
  const pauseTask = useCallback(async () => {
    try {
      setIsSubmitting(true);
      
      if (!state.browserTaskId) {
        throw new Error("No active task to pause");
      }
      
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: state.browserTaskId,
          action: 'pause'
        }
      });
      
      if (error || data.error) {
        throw new Error(error?.message || data?.error || "Failed to pause task");
      }
      
      console.log("Task paused successfully:", data);
      setTaskStatus('paused');
      
      // Update task in history
      updateTaskHistory(state.currentTaskId || "", {
        status: 'paused'
      });
      
      toast.success("Task paused");
    } catch (error) {
      console.error("Error pausing task:", error);
      setError(error instanceof Error ? error.message : "Unknown error pausing task");
      toast.error(error instanceof Error ? error.message : "Failed to pause task");
    } finally {
      setIsSubmitting(false);
    }
  }, [state.browserTaskId, state.currentTaskId, setTaskStatus, setError, updateTaskHistory]);
  
  const resumeTask = useCallback(async () => {
    try {
      setIsSubmitting(true);
      
      if (!state.browserTaskId) {
        throw new Error("No active task to resume");
      }
      
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: state.browserTaskId,
          action: 'resume'
        }
      });
      
      if (error || data.error) {
        throw new Error(error?.message || data?.error || "Failed to resume task");
      }
      
      console.log("Task resumed successfully:", data);
      setTaskStatus('running');
      
      // Update task in history
      updateTaskHistory(state.currentTaskId || "", {
        status: 'running'
      });
      
      toast.success("Task resumed");
    } catch (error) {
      console.error("Error resuming task:", error);
      setError(error instanceof Error ? error.message : "Unknown error resuming task");
      toast.error(error instanceof Error ? error.message : "Failed to resume task");
    } finally {
      setIsSubmitting(false);
    }
  }, [state.browserTaskId, state.currentTaskId, setTaskStatus, setError, updateTaskHistory]);
  
  const stopTask = useCallback(async () => {
    try {
      setIsSubmitting(true);
      
      if (!state.browserTaskId) {
        throw new Error("No active task to stop");
      }
      
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: state.browserTaskId,
          action: 'stop'
        }
      });
      
      if (error || data.error) {
        throw new Error(error?.message || data?.error || "Failed to stop task");
      }
      
      console.log("Task stopped successfully:", data);
      setTaskStatus('stopped');
      setIsProcessing(false);
      
      // Update task in history
      updateTaskHistory(state.currentTaskId || "", {
        status: 'stopped'
      });
      
      toast.success("Task stopped");
    } catch (error) {
      console.error("Error stopping task:", error);
      setError(error instanceof Error ? error.message : "Unknown error stopping task");
      toast.error(error instanceof Error ? error.message : "Failed to stop task");
    } finally {
      setIsSubmitting(false);
    }
  }, [state.browserTaskId, state.currentTaskId, setTaskStatus, setIsProcessing, setError, updateTaskHistory]);
  
  const restartTask = useCallback(async () => {
    try {
      // Use the current task input or the saved one
      const savedInput = localStorage.getItem('workerAI_lastTaskInput') || state.taskInput;
      
      if (!savedInput.trim()) {
        toast.error("No task input available to restart");
        return;
      }
      
      // Reset state
      setTaskOutput(null);
      setError(null);
      setLiveUrl(null);
      
      // Start a new task with the same input
      await startTask();
      
      toast.success("Task restarted");
    } catch (error) {
      console.error("Error restarting task:", error);
      setError(error instanceof Error ? error.message : "Unknown error restarting task");
      toast.error(error instanceof Error ? error.message : "Failed to restart task");
    }
  }, [state.taskInput, setTaskOutput, setError, setLiveUrl, startTask]);
  
  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    isSubmitting
  };
}
