
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";

interface TaskStep {
  id: string;
  task_id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details: string | null;
  screenshot: string | null;
  created_at: string;
}

interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  last_refill: string | null;
  created_at: string;
  updated_at?: string;
}

interface CaptureWebsiteResponse {
  image_url: string;
  url: string;
  saved?: boolean;
  error?: string;
}

export function useBrowserUseTask() {
  const [taskInput, setTaskInput] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [taskOutput, setTaskOutput] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped'>('idle');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast: useToastFn } = useToast();
  
  const startTask = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Deduct credits
      const { error: creditError } = await supabase.rpc('deduct_credits', { 
        user_id: user.id, 
        credits_to_deduct: 1 
      });
      
      if (creditError) throw creditError;
      
      // Fetch updated credits
      const { data: updatedCredits, error: updatedCreditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (updatedCreditsError) throw updatedCreditsError;
      setUserCredits(updatedCredits as UserCredits);
      
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .insert([{ 
          user_id: user.id, 
          input: taskInput,
          status: 'running'
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      
      setCurrentTaskId(data.id);
      setTaskStatus('running');
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
  }, [taskInput]);
  
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
  }, [currentTaskId]);
  
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
      
      setTaskStatus('running');
      toast.success("Task Resumed!", {
        description: "Your browser automation task has been resumed."
      });
    } catch (err: any) {
      console.error("Error resuming task:", err);
      setError(err.message || "Failed to resume task");
      toast.error("Error Resuming Task", {
        description: err.message || "Failed to resume task."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId]);
  
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
  }, [currentTaskId]);
  
  const captureScreenshot = useCallback(async () => {
    if (!currentUrl) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('capture-website', {
        body: { 
          url: currentUrl,
          save_browser_data: true 
        }
      });
      
      if (error) {
        console.error("Function error", error);
        return false;
      }
      
      const response = data as CaptureWebsiteResponse;
      
      if (response.error) {
        console.error("Screenshot error:", response.error);
        return false;
      }
      
      if (response.image_url) {
        setScreenshot(response.image_url);
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error("Error capturing screenshot:", err);
      setError(err.message || "Failed to capture screenshot");
      return false;
    }
  }, [currentUrl]);
  
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        if (data) setUserCredits(data as UserCredits);
      } catch (err: any) {
        console.error("Error fetching user credits:", err);
        setError(err.message || "Failed to fetch user credits");
      }
    };
    
    fetchUserCredits();
  }, []);

  useEffect(() => {
    if (currentTaskId) {
      const intervalId = setInterval(async () => {
        try {
          const { data: taskData, error: taskError } = await supabase
            .from('browser_automation_tasks')
            .select('*')
            .eq('id', currentTaskId)
            .maybeSingle();
          
          if (taskError) throw taskError;
          
          if (taskData) {
            setProgress(taskData.progress || 0);
            setTaskStatus(taskData.status as any || 'idle');
            
            // Handle current URL properly
            if (taskData.current_url && typeof taskData.current_url === 'string') {
              setCurrentUrl(taskData.current_url);
            }
            
            // Get steps for this task
            const { data: stepsData, error: stepsError } = await supabase
              .from('browser_automation_steps')
              .select('*')
              .eq('task_id', currentTaskId)
              .order('created_at', { ascending: true });
            
            if (stepsError) throw stepsError;
            
            if (stepsData) {
              setTaskSteps(stepsData.map(step => ({
                ...step,
                // Handle potential JSON string in details
                details: typeof step.details === 'string' ? step.details : 
                         step.details ? JSON.stringify(step.details) : null
              })));
            }
            
            if (taskData.output) {
              setTaskOutput(taskData.output);
            }
            
            // If task is finished or failed, clear the interval
            if (['finished', 'failed', 'stopped'].includes(taskData.status)) {
              clearInterval(intervalId);
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error("Error fetching task:", error);
        }
      }, 2000);
      
      return () => clearInterval(intervalId);
    }
  }, [currentTaskId]);
  
  return {
    taskInput,
    setTaskInput,
    currentTaskId,
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    progress,
    taskSteps,
    taskOutput,
    taskStatus,
    currentUrl,
    setCurrentUrl,
    screenshot,
    captureScreenshot,
    userCredits,
    error,
  };
}
