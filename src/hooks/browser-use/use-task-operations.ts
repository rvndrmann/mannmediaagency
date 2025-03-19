
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrowserTaskState } from "./types";

export function useTaskOperations(
  state: BrowserTaskState,
  setState: {
    setIsProcessing: (value: boolean) => void;
    setCurrentTaskId: (value: string | null) => void;
    setTaskStatus: (value: any) => void;
    setProgress: (value: number) => void;
    setTaskSteps: (value: any[]) => void;
    setTaskOutput: (value: string | null) => void;
    setCurrentUrl: (value: string | null) => void;
    setScreenshot: (value: string | null) => void;
    setUserCredits: (value: any) => void;
    setError: (value: string | null) => void;
    setTaskInput: (value: string) => void;
  }
) {
  const {
    taskInput,
    currentTaskId,
  } = state;

  const {
    setIsProcessing,
    setCurrentTaskId,
    setTaskStatus,
    setProgress,
    setTaskSteps,
    setTaskOutput,
    setCurrentUrl,
    setScreenshot,
    setUserCredits,
    setError,
    setTaskInput,
  } = setState;

  const startTask = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error: creditError } = await supabase.rpc('deduct_credits', { 
        user_id: user.id, 
        credits_to_deduct: 1 
      });
      
      if (creditError) throw creditError;
      
      // Get updated user credits with explicit column selection
      const { data: updatedCredits, error: updatedCreditsError } = await supabase
        .from('user_credits')
        .select('id, user_id, credits_remaining, last_refill, created_at, updated_at')
        .eq('user_id', user.id)
        .single();
      
      if (updatedCreditsError) throw updatedCreditsError;
      setUserCredits(updatedCredits);
      
      // Create a task record in our database
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .insert([{ 
          user_id: user.id, 
          input: taskInput,
          status: 'running'
        }])
        .select('id, user_id, input, status, progress, current_url, output, created_at, updated_at')
        .single();
      
      if (error) throw error;
      
      setCurrentTaskId(data.id);
      setTaskStatus('running');
      
      // Call Browser Use API to start the task
      const response = await supabase.functions.invoke('browser-use-api', {
        body: { 
          task: taskInput,
          save_browser_data: true,
          task_id: data.id
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      toast.success("Task Started!", {
        description: "Your browser automation task has started."
      });
    } catch (err: any) {
      console.error("Error starting task:", err);
      setError(err.message || "Failed to start task");
      toast.error("Error Starting Task", {
        description: err.message || "Failed to start task."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [taskInput, setIsProcessing, setError, setUserCredits, setCurrentTaskId, setTaskStatus]);
  
  const pauseTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('browser_automation_tasks')
        .update({ status: 'paused' })
        .eq('id', currentTaskId);
      
      if (error) throw error;
      
      // Call Browser Use API to pause the task
      const response = await supabase.functions.invoke('browser-use-api', {
        body: { 
          action: 'pause',
          task_id: currentTaskId
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      setTaskStatus('paused');
      toast.success("Task Paused!", {
        description: "Your browser automation task has been paused."
      });
    } catch (err: any) {
      console.error("Error pausing task:", err);
      setError(err.message || "Failed to pause task");
      toast.error("Error Pausing Task", {
        description: err.message || "Failed to pause task."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, setIsProcessing, setTaskStatus, setError]);
  
  const resumeTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('browser_automation_tasks')
        .update({ status: 'running' })
        .eq('id', currentTaskId);
      
      if (error) throw error;
      
      // Call Browser Use API to resume the task
      const response = await supabase.functions.invoke('browser-use-api', {
        body: { 
          action: 'resume',
          task_id: currentTaskId
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      setTaskStatus('running');
      toast.success("Task Resumed!", {
        description: "Your browser automation task has been resumed."
      });
    } catch (err: any) {
      console.error("Error resuming task:", err);
      setError(err.message || "Failed to resume task");
      toast.error("Error Resuming Task", {
        description: err.message || "Failed to resume task"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, setIsProcessing, setTaskStatus, setError]);
  
  const stopTask = useCallback(async () => {
    if (!currentTaskId) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('browser_automation_tasks')
        .update({ status: 'stopped' })
        .eq('id', currentTaskId);
      
      if (error) throw error;
      
      // Call Browser Use API to stop the task
      const response = await supabase.functions.invoke('browser-use-api', {
        body: { 
          action: 'stop',
          task_id: currentTaskId
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      setTaskStatus('stopped');
      setProgress(0);
      setTaskSteps([]);
      setTaskOutput(null);
      setCurrentUrl(null);
      setScreenshot(null);
      setCurrentTaskId(null);
      setTaskInput("");
      toast.success("Task Stopped!", {
        description: "Your browser automation task has been stopped."
      });
    } catch (err: any) {
      console.error("Error stopping task:", err);
      setError(err.message || "Failed to stop task");
      toast.error("Error Stopping Task", {
        description: err.message || "Failed to stop task."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentTaskId,
    setIsProcessing,
    setTaskStatus,
    setProgress,
    setTaskSteps,
    setTaskOutput,
    setCurrentUrl,
    setScreenshot,
    setCurrentTaskId,
    setTaskInput,
    setError
  ]);

  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask
  };
}
