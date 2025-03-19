import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStatus } from "./types";

interface TaskMonitoringSetters {
  setProgress: (progress: number) => void;
  setTaskStatus: (status: TaskStatus) => void;
  setCurrentUrl: (url: string | null) => void;
  setTaskSteps: (steps: any[]) => void;
  setTaskOutput: (output: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setLiveUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: BrowserTaskState["connectionStatus"]) => void;
}

export function useTaskMonitoring(
  state: BrowserTaskState,
  setters: TaskMonitoringSetters
) {
  const { 
    currentTaskId, 
    isProcessing, 
    taskStatus, 
    error
  } = state;

  const {
    setProgress,
    setTaskStatus,
    setCurrentUrl,
    setTaskSteps,
    setTaskOutput,
    setIsProcessing,
    setLiveUrl,
    setError,
    setConnectionStatus
  } = setters;

  const intervalRef = useRef<number | null>(null);
  const errorCountRef = useRef<number>(0);
  const lastErrorRef = useRef<string | null>(null);
  const taskExpiredRef = useRef<boolean>(false);
  const browserTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (taskStatus === 'expired') {
      taskExpiredRef.current = true;
    } else if (taskStatus === 'running' || taskStatus === 'created' || taskStatus === 'pending') {
      taskExpiredRef.current = false;
    }
  }, [taskStatus]);

  useEffect(() => {
    browserTaskIdRef.current = null;
  }, [currentTaskId]);

  useEffect(() => {
    if (!currentTaskId || !isProcessing || taskExpiredRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const fetchBrowserTaskId = async () => {
      try {
        if (!browserTaskIdRef.current) {
          console.log(`Fetching browser_task_id for task ${currentTaskId}`);
          
          const { data, error } = await supabase
            .from('browser_automation_tasks')
            .select('browser_task_id')
            .eq('id', currentTaskId)
            .single();
            
          if (error) {
            console.error("Error fetching browser_task_id:", error);
            return null;
          }
          
          if (data && data.browser_task_id) {
            console.log(`Found browser_task_id: ${data.browser_task_id}`);
            browserTaskIdRef.current = data.browser_task_id;
          } else {
            console.warn("No browser_task_id found for this task");
          }
        }
        
        return browserTaskIdRef.current;
      } catch (err) {
        console.error("Error in fetchBrowserTaskId:", err);
        return null;
      }
    };

    errorCountRef.current = 0;
    
    const pollStatus = async () => {
      try {
        const browserTaskId = await fetchBrowserTaskId();
        
        if (!browserTaskId) {
          console.warn(`Cannot monitor task: No browser_task_id available for task ${currentTaskId}`);
          return;
        }
        
        if (!state.liveUrl) {
          try {
            const { data: mediaData, error: mediaError } = await supabase.functions.invoke('browser-use-api', {
              body: {
                task_id: browserTaskId,
                url_check_only: true
              }
            });

            if (mediaError) {
              console.error("Error fetching media URL:", mediaError);
            } else if (mediaData?.recording_url) {
              console.log("Setting live URL from media endpoint:", mediaData.recording_url);
              setLiveUrl(mediaData.recording_url);
              
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: mediaData.recording_url })
                .eq('id', currentTaskId);
            } else if (mediaData?.live_url) {
              console.log("Setting live URL from media endpoint:", mediaData.live_url);
              setLiveUrl(mediaData.live_url);
              
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: mediaData.live_url })
                .eq('id', currentTaskId);
            }
          } catch (mediaCheckError) {
            console.error("Error checking media:", mediaCheckError);
          }
        }

        const { data, error: apiError } = await supabase.functions.invoke('browser-use-api', {
          body: { task_id: browserTaskId }
        });

        if (apiError) {
          errorCountRef.current++;
          console.error(`Error fetching task status (attempt ${errorCountRef.current}):`, apiError);
          
          if (errorCountRef.current > 5) {
            setError(`Error checking task status: ${apiError.message}`);
            setConnectionStatus("error");
            setIsProcessing(false);
            
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return;
        }
        
        errorCountRef.current = 0;

        if (data.error) {
          if (data.task_expired || data.error.includes("not found") || data.error.includes("expired")) {
            const errorMsg = data.message || "Task has expired. Please restart the task to continue.";
            
            taskExpiredRef.current = true;
            
            if (lastErrorRef.current !== errorMsg) {
              lastErrorRef.current = errorMsg;
              setError(errorMsg);
            }
            
            setConnectionStatus("error");
            setTaskStatus('expired');
            setIsProcessing(false);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ 
                status: 'expired',
                completed_at: new Date().toISOString()
              })
              .eq('id', currentTaskId);
              
            await supabase
              .from('browser_task_history')
              .update({ 
                status: 'expired',
                completed_at: new Date().toISOString(),
                output: JSON.stringify({ error: errorMsg })
              })
              .eq('browser_task_id', browserTaskId);
            
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
          
          setError(data.error);
          return;
        }
        
        lastErrorRef.current = null;

        if (data) {
          console.log("Task status data:", data);
          
          if (data.status) {
            const normalizedStatus = data.status === 'finished' ? 'completed' : data.status;
            setTaskStatus(normalizedStatus as TaskStatus);
            
            if (["completed", "failed", "stopped"].includes(normalizedStatus)) {
              setIsProcessing(false);
              
              await supabase
                .from('browser_automation_tasks')
                .update({ 
                  status: normalizedStatus,
                  completed_at: new Date().toISOString()
                })
                .eq('id', currentTaskId);
                
              const outputData = data.output ? 
                (typeof data.output === 'string' ? data.output : JSON.stringify(data.output)) : 
                null;
                
              await supabase
                .from('browser_task_history')
                .update({ 
                  status: normalizedStatus,
                  completed_at: new Date().toISOString(),
                  output: outputData
                })
                .eq('browser_task_id', browserTaskId);
                
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          }
          
          if (data.live_url && !state.liveUrl) {
            console.log("Setting live URL from status endpoint:", data.live_url);
            setLiveUrl(data.live_url);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ live_url: data.live_url })
              .eq('id', currentTaskId);
              
            await supabase
              .from('browser_task_history')
              .update({ result_url: data.live_url })
              .eq('browser_task_id', browserTaskId);
          } else if (data.browser?.live_url && !state.liveUrl) {
            console.log("Setting live URL from browser data:", data.browser.live_url);
            setLiveUrl(data.browser.live_url);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ live_url: data.browser.live_url })
              .eq('id', currentTaskId);
              
            await supabase
              .from('browser_task_history')
              .update({ result_url: data.browser.live_url })
              .eq('browser_task_id', browserTaskId);
          }
          
          if (data.current_url) {
            setCurrentUrl(data.current_url);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ current_url: data.current_url })
              .eq('id', currentTaskId);
          }
          
          if (typeof data.progress === 'number') {
            const progressValue = data.progress;
            setProgress(progressValue);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ progress: progressValue })
              .eq('id', currentTaskId);
          } else if (data.steps && data.steps.length > 0) {
            const progressValue = Math.min(Math.round((data.steps.length / 10) * 100), 95);
            setProgress(progressValue);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ progress: progressValue })
              .eq('id', currentTaskId);
          }
          
          if (data.steps && Array.isArray(data.steps)) {
            setTaskSteps(data.steps);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ 
                output: JSON.stringify({ steps: JSON.parse(stepsJson) }) 
              })
              .eq('id', currentTaskId);
          }
          
          if (data.output) {
            let output;
            
            if (typeof data.output === 'string') {
              try {
                output = JSON.parse(data.output);
              } catch (e) {
                output = data.output;
              }
            } else {
              output = data.output;
            }
            
            const formattedOutput = typeof output === 'object' 
              ? JSON.stringify(output, null, 2) 
              : String(output);
              
            setTaskOutput(formattedOutput);
            
            await supabase
              .from('browser_automation_tasks')
              .update({ output: formattedOutput })
              .eq('id', currentTaskId);
              
            await supabase
              .from('browser_task_history')
              .update({ output: formattedOutput })
              .eq('browser_task_id', browserTaskId);
          }
        }
      } catch (error) {
        console.error("Error in task monitoring:", error);
      }
    };

    pollStatus();

    const pollInterval = taskStatus === 'running' ? 5000 : 3000;
    intervalRef.current = setInterval(pollStatus, pollInterval) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentTaskId, isProcessing, taskStatus, state.liveUrl, setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing, setLiveUrl, setError, setConnectionStatus]);
}
