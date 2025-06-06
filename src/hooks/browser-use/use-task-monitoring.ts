
import { useEffect, useRef, useCallback } from "react";
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
    taskStatus
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
  const currentBrowserTaskIdRef = useRef<string | null>(null);

  // Track when task status changes to expired
  useEffect(() => {
    if (taskStatus === 'expired') {
      taskExpiredRef.current = true;
    } else if (taskStatus === 'running' || taskStatus === 'created' || taskStatus === 'pending') {
      taskExpiredRef.current = false;
    }
  }, [taskStatus]);

  // Reset browser task ID when current task ID changes
  useEffect(() => {
    browserTaskIdRef.current = null;
    currentBrowserTaskIdRef.current = null;
  }, [currentTaskId]);

  const fetchBrowserTaskId = useCallback(async () => {
    try {
      if (!browserTaskIdRef.current && currentTaskId) {
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
          currentBrowserTaskIdRef.current = data.browser_task_id;
        } else {
          console.warn("No browser_task_id found for this task");
        }
      }
      
      return browserTaskIdRef.current;
    } catch (err) {
      console.error("Error in fetchBrowserTaskId:", err);
      return null;
    }
  }, [currentTaskId]);

  // The main monitoring effect
  useEffect(() => {
    if (!currentTaskId || !isProcessing || taskExpiredRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    errorCountRef.current = 0;
    
    const pollStatus = async () => {
      try {
        const browserTaskId = await fetchBrowserTaskId();
        
        if (!browserTaskId) {
          console.warn(`Cannot monitor task: No browser_task_id available for task ${currentTaskId}`);
          return;
        }
        
        // Make sure we're getting updates for the current task
        if (currentBrowserTaskIdRef.current !== browserTaskId) {
          currentBrowserTaskIdRef.current = browserTaskId;
          console.log(`Switched to monitoring browser task: ${browserTaskId}`);
        }
        
        // Check for live URL if we don't have one yet
        if (!state.liveUrl) {
          try {
            const { data: mediaData, error: mediaError } = await supabase.functions.invoke('browser-use-api', {
              body: {
                action: 'get',
                taskId: browserTaskId
              }
            });

            if (mediaError) {
              console.error("Error fetching media URL:", mediaError);
            } else if (mediaData?.live_url) {
              console.log("Setting live URL:", mediaData.live_url);
              setLiveUrl(mediaData.live_url);
              
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: mediaData.live_url })
                .eq('id', currentTaskId);
              
              // Also update the task history for this browser task ID
              const { data: historyData } = await supabase
                .from('browser_task_history')
                .select('id')
                .eq('browser_task_id', browserTaskId)
                .maybeSingle();
                
              if (historyData?.id) {
                await supabase
                  .from('browser_task_history')
                  .update({ result_url: mediaData.live_url })
                  .eq('id', historyData.id);
              }
            }
          } catch (mediaCheckError) {
            console.error("Error checking media:", mediaCheckError);
          }
        }

        // Get task status and details
        const { data, error: apiError } = await supabase.functions.invoke('browser-use-api', {
          body: { 
            action: 'get',
            taskId: browserTaskId 
          }
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
              
            // Update the specific task history record matching this browser task ID
            const { data: historyData } = await supabase
              .from('browser_task_history')
              .select('id')
              .eq('browser_task_id', browserTaskId)
              .maybeSingle();
              
            if (historyData?.id) {
              await supabase
                .from('browser_task_history')
                .update({ 
                  status: 'expired',
                  completed_at: new Date().toISOString(),
                  output: JSON.stringify({ error: errorMsg })
                })
                .eq('id', historyData.id);
            }
            
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
          console.log(`Task status update for ${browserTaskId}:`, data.status);
          
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
              
              // Update the specific task history record
              const { data: historyData } = await supabase
                .from('browser_task_history')
                .select('id')
                .eq('browser_task_id', browserTaskId)
                .maybeSingle();
                
              if (historyData?.id) {
                await supabase
                  .from('browser_task_history')
                  .update({ 
                    status: normalizedStatus,
                    completed_at: new Date().toISOString(),
                    output: outputData
                  })
                  .eq('id', historyData.id);
              }
                
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
              
            // Update the specific task history record
            const { data: historyData } = await supabase
              .from('browser_task_history')
              .select('id')
              .eq('browser_task_id', browserTaskId)
              .maybeSingle();
              
            if (historyData?.id) {
              await supabase
                .from('browser_task_history')
                .update({ result_url: data.live_url })
                .eq('id', historyData.id);
            }
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
            
            // Fix: Convert steps to JSON string before storing
            const stepsJson = JSON.stringify({ steps: data.steps });
            
            await supabase
              .from('browser_automation_tasks')
              .update({ 
                output: stepsJson
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
              
            // Update the specific task history record with the output
            const { data: historyData } = await supabase
              .from('browser_task_history')
              .select('id')
              .eq('browser_task_id', browserTaskId)
              .maybeSingle();
              
            if (historyData?.id) {
              await supabase
                .from('browser_task_history')
                .update({ output: formattedOutput })
                .eq('id', historyData.id);
            }
          }
        }
      } catch (error) {
        console.error("Error in task monitoring:", error);
      }
    };

    // Initial poll when monitoring starts
    pollStatus();

    // Different polling intervals based on status to reduce load
    const pollInterval = taskStatus === 'running' ? 5000 : 3000;
    intervalRef.current = setInterval(pollStatus, pollInterval) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    currentTaskId, 
    isProcessing, 
    taskStatus, 
    state.liveUrl, 
    fetchBrowserTaskId,
    setProgress, 
    setTaskStatus, 
    setCurrentUrl, 
    setTaskSteps, 
    setTaskOutput, 
    setIsProcessing, 
    setLiveUrl, 
    setError, 
    setConnectionStatus
  ]);
}
