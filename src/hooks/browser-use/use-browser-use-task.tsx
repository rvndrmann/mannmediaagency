import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  
  const startTask = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Deduct credits
      const { error: creditError } = await supabase.rpc('deduct_credits', { user_id: user.id, credits_to_deduct: 1 });
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
      toast({
        title: "Task Started!",
        description: "Your browser automation task has started.",
      });
    } catch (err: any) {
      console.error("Error starting task:", err);
      setError(err.message || "Failed to start task");
      toast({
        title: "Error Starting Task",
        description: err.message || "Failed to start task.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [taskInput, toast]);
  
  const pauseTask = useCallback(async () => {
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
      toast({
        title: "Task Paused!",
        description: "Your browser automation task has been paused.",
      });
    } catch (err: any) {
      console.error("Error pausing task:", err);
      setError(err.message || "Failed to pause task");
      toast({
        title: "Error Pausing Task",
        description: err.message || "Failed to pause task.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, toast]);
  
  const resumeTask = useCallback(async () => {
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
      toast({
        title: "Task Resumed!",
        description: "Your browser automation task has been resumed.",
      });
    } catch (err: any) {
      console.error("Error resuming task:", err);
      setError(err.message || "Failed to resume task");
      toast({
        title: "Error Resuming Task",
        description: err.message || "Failed to resume task.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, toast]);
  
  const stopTask = useCallback(async () => {
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
      toast({
        title: "Task Stopped!",
        description: "Your browser automation task has been stopped.",
      });
    } catch (err: any) {
      console.error("Error stopping task:", err);
      setError(err.message || "Failed to stop task");
      toast({
        title: "Error Stopping Task",
        description: err.message || "Failed to stop task.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, toast]);
  
  const captureScreenshot = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('capture-website');
      if (error) {
        console.error("Function error", error);
        return false;
      }
      setScreenshot(data.image_url);
      return true;
    } catch (err: any) {
      console.error("Error capturing screenshot:", err);
      setError(err.message || "Failed to capture screenshot");
      return false;
    }
  }, []);
  
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        setUserCredits(data as UserCredits);
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
            .single();
          
          if (taskError) throw taskError;
          
          if (taskData) {
            setProgress(taskData.progress || 0);
            setTaskStatus(taskData.status);
            
            // Fix the URL property access
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
                details: typeof step.details === 'string' ? step.details : JSON.stringify(step.details),
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
  }, [currentTaskId, supabase]);
  
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
