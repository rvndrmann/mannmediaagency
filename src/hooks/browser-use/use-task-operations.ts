
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState } from "./types";
import { useUser } from "@/hooks/use-user";
import { useUserCredits } from "@/hooks/use-user-credits"; // Import useUserCredits
import { toast } from "sonner";
import { useTaskHistory } from "./use-task-history";

const BROWSER_TASK_CREDIT_COST = 1; // Define cost constant

export function useTaskOperations(
  state: BrowserTaskState,
  setters: any
) {
  const { user } = useUser();
  const { data: userCreditsData } = useUserCredits(); // Get user credits data
  const queryClient = useQueryClient(); // Get query client instance
  const { saveTaskToHistory, updateTaskHistory, getTaskHistoryByBrowserTaskId } = useTaskHistory();
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const [isPausingTask, setIsPausingTask] = useState(false);
  const [isResumingTask, setIsResumingTask] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const startTask = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    if (!state.taskInput.trim()) {
      toast.error("Please provide a task description");
      return;
    }

    // --- Frontend Pre-emptive Credit Check ---
    if (userCreditsData && userCreditsData.credits_remaining < BROWSER_TASK_CREDIT_COST) {
      toast.error("Insufficient credits to start this task.");
      return;
    }
    // --- End Frontend Check ---

    try {
      setters.setIsProcessing(true);
      setters.setError(null);
      setters.setTaskOutput(null);
      setters.setTaskSteps([]);
      setters.setProgress(0);
      setters.setLiveUrl(null);
      setters.setConnectionStatus("connecting");
      
      const requestData = {
        task: state.taskInput,
        environment: state.environment,
        browser_config: state.browserConfig,
        userId: user.id // Pass userId to the backend function
      };

      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: requestData
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`${state.environment.charAt(0).toUpperCase() + state.environment.slice(1)} task started`);
      
      setters.setCurrentTaskId(data.taskId);
      setters.setTaskStatus("running");
      
      if (data.liveUrl) {
        setters.setLiveUrl(data.liveUrl);
      }
      
      // Create a history record for this task
      const historyRecord = await saveTaskToHistory({
        task_input: state.taskInput,
        status: "running",
        user_id: user.id,
        browser_task_id: data.taskId,
        environment: state.environment
      });
      
      console.log("Created history record:", historyRecord);
  // Invalidate credits on successful start to reflect deduction
  queryClient.invalidateQueries({ queryKey: ['userCredits'] });

} catch (error) {
  console.error("Error starting task:", error);
  // Use the error message from the backend if available
  let errorMessage = "Failed to start task";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'error_description' in error) {
     // Handle Supabase function invocation errors which might have error_description
     errorMessage = (error as any).error_description || errorMessage;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
     // Handle other potential error object structures
     errorMessage = (error as any).message || errorMessage;
  }
  
  toast.error(`Failed to start task: ${errorMessage}`);
  setters.setIsProcessing(false);
  setters.setConnectionStatus("error");
  setters.setError(errorMessage);
  
  // Invalidate credits on failure as well, in case of refunds or backend errors
  queryClient.invalidateQueries({ queryKey: ['userCredits'] });
}
    }
  };

  const stopTask = async () => {
    if (!state.currentTaskId) {
      toast.error("No active task to stop");
      return;
    }

    try {
      setIsStoppingTask(true);
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "stop",
          taskId: state.currentTaskId
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Task stopped");
      setters.setTaskStatus("stopped");
      setters.setIsProcessing(false);
      setters.setConnectionStatus("disconnected");
      
      // Update history record
      const historyRecord = getTaskHistoryByBrowserTaskId(state.currentTaskId);
      if (historyRecord) {
        await updateTaskHistory(historyRecord.id, {
          status: "stopped",
          completed_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error stopping task:", error);
      toast.error("Failed to stop task");
    } finally {
      setIsStoppingTask(false);
    }
  };

  const pauseTask = async () => {
    if (!state.currentTaskId) {
      toast.error("No active task to pause");
      return;
    }

    try {
      setIsPausingTask(true);
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "pause",
          taskId: state.currentTaskId
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Task paused");
      setters.setTaskStatus("paused");
      
      // Update history record
      const historyRecord = getTaskHistoryByBrowserTaskId(state.currentTaskId);
      if (historyRecord) {
        await updateTaskHistory(historyRecord.id, { status: "paused" });
      }
    } catch (error) {
      console.error("Error pausing task:", error);
      toast.error("Failed to pause task");
    } finally {
      setIsPausingTask(false);
    }
  };

  const resumeTask = async () => {
    if (!state.currentTaskId) {
      toast.error("No paused task to resume");
      return;
    }

    try {
      setIsResumingTask(true);
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          action: "resume",
          taskId: state.currentTaskId
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Task resumed");
      setters.setTaskStatus("running");
      setters.setIsProcessing(true);
      setters.setConnectionStatus("connected");
      
      // Update history record
      const historyRecord = getTaskHistoryByBrowserTaskId(state.currentTaskId);
      if (historyRecord) {
        await updateTaskHistory(historyRecord.id, { status: "running" });
      }
    } catch (error) {
      console.error("Error resuming task:", error);
      toast.error("Failed to resume task");
    } finally {
      setIsResumingTask(false);
    }
  };

  const restartTask = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    try {
      setIsRestarting(true);
      setters.setIsProcessing(true);
      setters.setError(null);
      setters.setTaskOutput(null);
      setters.setTaskSteps([]);
      setters.setProgress(0);
      setters.setLiveUrl(null);
      setters.setCurrentTaskId(null);
      setters.setConnectionStatus("connecting");
      
      const requestData = {
        task: state.taskInput,
        environment: state.environment,
        browser_config: state.browserConfig
      };

      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: requestData
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Task restarted`);
      
      setters.setCurrentTaskId(data.taskId);
      setters.setTaskStatus("running");
      
      if (data.liveUrl) {
        setters.setLiveUrl(data.liveUrl);
      }
      
      // Create new history record for restarted task
      await saveTaskToHistory({
        task_input: state.taskInput,
        status: "running",
        user_id: user.id,
        browser_task_id: data.taskId,
        environment: state.environment
      });

    } catch (error) {
      console.error("Error restarting task:", error);
      toast.error(`Failed to restart task: ${error instanceof Error ? error.message : "Unknown error"}`);
      setters.setIsProcessing(false);
      setters.setConnectionStatus("error");
      setters.setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsRestarting(false);
    }
  };

  return {
    startTask,
    stopTask,
    pauseTask,
    resumeTask,
    restartTask,
    isStoppingTask,
    isPausingTask,
    isResumingTask,
    isRestarting
  };
}
