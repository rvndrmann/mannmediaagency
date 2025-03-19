
import { supabase } from "@/integrations/supabase/client";
import { BrowserConfig, TaskStatus } from "./types";

// Define the structure of the state and setter functions passed to this hook
interface TaskState {
  taskInput: string;
  currentTaskId: string | null;
  isProcessing: boolean;
  taskStatus: TaskStatus;
  browserConfig: BrowserConfig;
}

interface StateSetters {
  setCurrentTaskId: (id: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setTaskStatus: (status: TaskStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

// This hook contains the operations for task management
export function useTaskOperations(
  state: TaskState,
  stateSetters: StateSetters
) {
  const { 
    taskInput, 
    currentTaskId, 
    isProcessing, 
    taskStatus, 
    browserConfig 
  } = state;

  const { 
    setCurrentTaskId, 
    setIsProcessing, 
    setTaskStatus, 
    setProgress, 
    setError 
  } = stateSetters;

  // Start a new task
  const startTask = async () => {
    if (isProcessing) return;
    if (!taskInput.trim()) {
      setError("Please enter a task description");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      // First, create a new task record in the database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .insert({
          description: taskInput.substring(0, 255), // Limit to 255 chars for the description field
          full_input: taskInput,
          status: 'pending'
        })
        .select('id')
        .single();

      if (taskError) {
        console.error("Error creating task:", taskError);
        setError(`Failed to create task: ${taskError.message}`);
        setIsProcessing(false);
        return;
      }

      const taskId = taskData.id;
      console.log("Created task with ID:", taskId);
      setCurrentTaskId(taskId);

      // Now call the edge function to start the browser automation
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: taskInput,
          task_id: taskId,
          save_browser_data: true,
          browser_config: browserConfig
        }
      });

      if (apiError) {
        console.error("Edge function error:", apiError);
        
        // Update the task status to failed
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiError.message }) 
          })
          .eq('id', taskId);
        
        setError(`API Error: ${apiError.message}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      console.log("Browser Use API response:", apiResponse);
      
      if (apiResponse.error) {
        console.error("Browser Use API returned error:", apiResponse.error);
        
        // Update the task status to failed
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiResponse.error }) 
          })
          .eq('id', taskId);
        
        setError(`Task Error: ${apiResponse.error}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      // Task started successfully
      setTaskStatus('running');
    } catch (error) {
      console.error("Error starting task:", error);
      setError(`Unexpected error: ${error.message}`);
      setIsProcessing(false);
      setTaskStatus('failed');
    }
  };

  // Pause a running task
  const pauseTask = async () => {
    if (!currentTaskId || taskStatus !== 'running') return;

    try {
      // Call the edge function to pause the task
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
          action: 'pause'
        }
      });

      if (error) {
        console.error("Error pausing task:", error);
        setError(`Failed to pause task: ${error.message}`);
        return;
      }

      console.log("Pause task response:", data);
      
      // Update the local task status
      setTaskStatus('paused');
      
      // Update the task status in the database
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'paused' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in pauseTask:", error);
      setError(`Pause error: ${error.message}`);
    }
  };

  // Resume a paused task
  const resumeTask = async () => {
    if (!currentTaskId || taskStatus !== 'paused') return;

    try {
      // Call the edge function to resume the task
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
          action: 'resume'
        }
      });

      if (error) {
        console.error("Error resuming task:", error);
        setError(`Failed to resume task: ${error.message}`);
        return;
      }

      console.log("Resume task response:", data);
      
      // Update the local task status
      setTaskStatus('running');
      
      // Update the task status in the database
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'running' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in resumeTask:", error);
      setError(`Resume error: ${error.message}`);
    }
  };

  // Stop a running or paused task
  const stopTask = async () => {
    if (!currentTaskId || (taskStatus !== 'running' && taskStatus !== 'paused')) return;

    try {
      // Call the edge function to stop the task
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
          action: 'stop'
        }
      });

      if (error) {
        console.error("Error stopping task:", error);
        setError(`Failed to stop task: ${error.message}`);
        return;
      }

      console.log("Stop task response:", data);
      
      // Update the local task status
      setTaskStatus('stopped');
      setIsProcessing(false);
      
      // Update the task status in the database
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'stopped' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in stopTask:", error);
      setError(`Stop error: ${error.message}`);
    }
  };

  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask
  };
}
