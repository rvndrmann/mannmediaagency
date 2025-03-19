
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStep } from "./types";

export function useTaskMonitoring(
  state: BrowserTaskState,
  setState: {
    setProgress: (value: number) => void;
    setTaskStatus: (value: any) => void;
    setCurrentUrl: (value: string | null) => void;
    setTaskSteps: (value: TaskStep[]) => void;
    setTaskOutput: (value: string | null) => void;
    setIsProcessing: (value: boolean) => void;
  }
) {
  const { currentTaskId } = state;
  const { setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing } = setState;

  // Set up polling for task updates
  useEffect(() => {
    if (currentTaskId) {
      const intervalId = setInterval(async () => {
        try {
          // Get task data with explicit table references to avoid ambiguous column references
          const { data: taskData, error: taskError } = await supabase
            .from('browser_automation_tasks')
            .select('*')
            .eq('id', currentTaskId)
            .maybeSingle();
          
          if (taskError) throw taskError;
          
          if (taskData) {
            setProgress(taskData.progress || 0);
            setTaskStatus(taskData.status as any || 'idle');
            
            if (taskData.current_url && typeof taskData.current_url === 'string') {
              setCurrentUrl(taskData.current_url);
            }
            
            const { data: stepsData, error: stepsError } = await supabase
              .from('browser_automation_steps')
              .select('*')
              .eq('task_id', currentTaskId)
              .order('created_at', { ascending: true });
            
            if (stepsError) throw stepsError;
            
            if (stepsData) {
              setTaskSteps(stepsData.map(step => ({
                ...step,
                details: typeof step.details === 'string' ? step.details : 
                         step.details ? JSON.stringify(step.details) : null,
                status: step.status || 'pending'
              })));
            }
            
            if (taskData.output) {
              setTaskOutput(taskData.output);
            }
            
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
  }, [currentTaskId, setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing]);
}
