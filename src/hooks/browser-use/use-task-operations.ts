
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState } from "./types";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import { useTaskHistory } from "./use-task-history";

export function useTaskOperations(
  state: BrowserTaskState,
  setters: any
) {
  const { user } = useUser();
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

    } catch (error) {
      console.error("Error starting task:", error);
      toast.error(`Failed to start task: ${error instanceof Error ? error.message : "Unknown error"}`);
      setters.setIsProcessing(false);
      setters.setConnectionStatus("error");
      setters.setError(error instanceof Error ? error.message : "Unknown error");
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
