
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  screenshot?: string;
  timestamp: Date;
}

export function useBrowserUseTask() {
  const [taskInput, setTaskInput] = useState<string>("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [taskStatus, setTaskStatus] = useState<'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped'>('idle');
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [taskOutput, setTaskOutput] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>("https://www.google.com");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Get user credits
  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", user.id)
          .single();
          
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching user credits:", error);
        return { credits_remaining: 0 };
      }
    },
  });
  
  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);
  
  // Capture screenshot function
  const captureScreenshot = useCallback(async () => {
    if (typeof document === 'undefined') return false;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.querySelector('.browser-view-container');
      
      if (!element) {
        console.error('Could not find browser view container for screenshot');
        return false;
      }
      
      console.log('Capturing screenshot...');
      
      const canvas = await html2canvas(element as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1.5,
        backgroundColor: '#FFFFFF',
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot captured successfully');
      setScreenshot(dataUrl);
      return true;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return false;
    }
  }, []);
  
  // Start task function
  const startTask = useCallback(async () => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("You need at least 1 credit to use the Browser Use API");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setTaskSteps([]);
    setTaskOutput("");
    setProgress(0);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Authentication required. Please sign in to continue.");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      // Take initial screenshot
      await captureScreenshot();
      
      // Create task in database
      const { data: taskData, error: taskError } = await supabase
        .from("browser_automation_sessions")
        .insert({
          user_id: user.id,
          task_description: taskInput,
          status: 'active'
        })
        .select()
        .single();
      
      if (taskError) {
        throw new Error(taskError.message);
      }
      
      setCurrentTaskId(taskData.id);
      setTaskStatus('running');
      
      // Add initial step
      const initialStep: TaskStep = {
        id: crypto.randomUUID(),
        description: "Task started",
        status: 'completed',
        details: `Initializing task: ${taskInput}`,
        screenshot: screenshot || undefined,
        timestamp: new Date()
      };
      
      setTaskSteps([initialStep]);
      
      // Start polling for task updates
      startTaskPolling(taskData.id);
      
      // Deduct credits
      await supabase.rpc('safely_decrease_credits', { amount: 1 });
      await refetchCredits();
      
      toast.success("Task started successfully");
    } catch (error) {
      console.error("Error starting task:", error);
      setError(error instanceof Error ? error.message : "Failed to start task");
      toast.error(error instanceof Error ? error.message : "Failed to start task");
      setTaskStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  }, [taskInput, screenshot, userCredits, captureScreenshot, refetchCredits]);
  
  // Start polling for task updates
  const startTaskPolling = useCallback((taskId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    pollingInterval.current = setInterval(async () => {
      if (!taskId) return;
      
      try {
        // Get task status
        const { data: sessionData, error: sessionError } = await supabase
          .from("browser_automation_sessions")
          .select("*")
          .eq("id", taskId)
          .single();
        
        if (sessionError) throw sessionError;
        
        // Update task status
        if (sessionData.status === 'completed') {
          setTaskStatus('finished');
          setProgress(100);
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
        } else if (sessionData.status === 'failed') {
          setTaskStatus('failed');
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }
        }
        
        // Get task actions
        const { data: actionsData, error: actionsError } = await supabase
          .from("browser_automation_actions")
          .select("*")
          .eq("session_id", taskId)
          .order("created_at", { ascending: true });
        
        if (actionsError) throw actionsError;
        
        if (actionsData && actionsData.length > 0) {
          // Convert actions to steps
          const steps: TaskStep[] = actionsData.map((action, index) => ({
            id: action.id,
            description: `${action.action_type}: ${JSON.stringify(action.action_details)}`,
            status: action.status === 'executed' ? 'completed' : (action.status === 'pending' ? 'running' : (action.status === 'failed' ? 'failed' : 'pending')),
            details: action.reasoning,
            screenshot: action.screenshot_url,
            timestamp: new Date(action.created_at)
          }));
          
          setTaskSteps(steps);
          
          // Calculate progress
          const completedSteps = steps.filter(step => step.status === 'completed').length;
          const totalSteps = steps.length;
          const newProgress = Math.floor((completedSteps / totalSteps) * 100);
          setProgress(newProgress);
          
          // Update current URL from the latest action
          const latestAction = actionsData[actionsData.length - 1];
          if (latestAction.action_details.url) {
            setCurrentUrl(latestAction.action_details.url);
          }
          
          // Update task output on completion
          if (sessionData.status === 'completed') {
            setTaskOutput(JSON.stringify({
              taskId: taskId,
              description: sessionData.task_description,
              status: sessionData.status,
              steps: steps.length,
              completedAt: sessionData.completed_at,
              result: "Task completed successfully",
              url: currentUrl
            }, null, 2));
          }
        }
      } catch (error) {
        console.error("Error polling task:", error);
      }
    }, 2000);
  }, [currentUrl]);
  
  // Pause task function
  const pauseTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No active task to pause");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update task status in database
      const { error } = await supabase
        .from("browser_automation_sessions")
        .update({
          status: 'paused'
        })
        .eq("id", currentTaskId);
      
      if (error) throw error;
      
      setTaskStatus('paused');
      toast.success("Task paused");
      
      // Pause polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    } catch (error) {
      console.error("Error pausing task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to pause task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId]);
  
  // Resume task function
  const resumeTask = useCallback(async () => {
    if (!currentTaskId) {
      toast.error("No active task to resume");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update task status in database
      const { error } = await supabase
        .from("browser_automation_sessions")
        .update({
          status: 'active'
        })
        .eq("id", currentTaskId);
      
      if (error) throw error;
      
      setTaskStatus('running');
      toast.success("Task resumed");
      
      // Resume polling
      startTaskPolling(currentTaskId);
    } catch (error) {
      console.error("Error resuming task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to resume task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, startTaskPolling]);
  
  // Stop task function
  const stopTask = useCallback(async () => {
    if (!currentTaskId) {
      // If no current task, just reset the state
      setTaskInput("");
      setTaskSteps([]);
      setTaskOutput("");
      setProgress(0);
      setTaskStatus('idle');
      setCurrentTaskId(null);
      setError(null);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update task status in database
      const { error } = await supabase
        .from("browser_automation_sessions")
        .update({
          status: 'stopped',
          completed_at: new Date().toISOString()
        })
        .eq("id", currentTaskId);
      
      if (error) throw error;
      
      setTaskStatus('stopped');
      toast.info("Task stopped");
      
      // Stop polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // Generate final output
      setTaskOutput(JSON.stringify({
        taskId: currentTaskId,
        description: taskInput,
        status: 'stopped',
        steps: taskSteps.length,
        stoppedAt: new Date().toISOString(),
        result: "Task was manually stopped",
        url: currentUrl
      }, null, 2));
    } catch (error) {
      console.error("Error stopping task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to stop task");
    } finally {
      setIsProcessing(false);
    }
  }, [currentTaskId, taskInput, taskSteps, currentUrl]);
  
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
    captureScreenshot,
    screenshot,
    userCredits,
    error,
  };
}
