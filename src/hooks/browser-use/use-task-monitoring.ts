
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

  // Use a ref to track and cancel the interval on unmount
  const intervalRef = useRef<number | null>(null);
  
  // Use a ref to track how many consecutive errors occurred
  const errorCountRef = useRef<number>(0);
  
  // Track the last error seen to avoid repeating
  const lastErrorRef = useRef<string | null>(null);

  // Track if task is expired to avoid repeated status checks
  const taskExpiredRef = useRef<boolean>(false);
  
  // Store the browser_task_id separately to avoid constant database lookups
  const browserTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    // If task status changes to expired, update the ref
    if (taskStatus === 'expired') {
      taskExpiredRef.current = true;
    } else if (taskStatus === 'running' || taskStatus === 'created' || taskStatus === 'pending') {
      // Reset expired flag when a new task starts
      taskExpiredRef.current = false;
    }
  }, [taskStatus]);

  // Reset browser task ID when current task ID changes
  useEffect(() => {
    browserTaskIdRef.current = null;
  }, [currentTaskId]);

  useEffect(() => {
    // Only set up polling if there's a task ID and the task is processing
    // and the task is not already known to be expired
    if (!currentTaskId || !isProcessing || taskExpiredRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Get the browser_task_id from our database first time
    const fetchBrowserTaskId = async () => {
      try {
        // Only fetch if we don't already have it cached
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

    // Reset error count when starting monitoring
    errorCountRef.current = 0;
    
    // Start task polling at different rates based on status
    const pollStatus = async () => {
      try {
        // First get the browser task ID if we don't have it yet
        const browserTaskId = await fetchBrowserTaskId();
        
        // If we can't find a browser task ID after checking the database, log a warning
        if (!browserTaskId) {
          console.warn(`Cannot monitor task: No browser_task_id available for task ${currentTaskId}`);
          return;
        }
        
        // Check for media first if we don't have a live URL
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
              
              // Update the database with the live URL
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: mediaData.recording_url })
                .eq('id', currentTaskId);
            } else if (mediaData?.live_url) {
              console.log("Setting live URL from media endpoint:", mediaData.live_url);
              setLiveUrl(mediaData.live_url);
              
              // Update the database with the live URL
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: mediaData.live_url })
                .eq('id', currentTaskId);
            }
          } catch (mediaCheckError) {
            console.error("Error checking media:", mediaCheckError);
          }
        }

        // Check overall task status using the browser task ID
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
            
            // Clear the interval after consecutive errors
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return;
        }
        
        // Reset error count after successful calls
        errorCountRef.current = 0;

        // Handle API errors as returned in the data
        if (data.error) {
          // Check if this is a task expired error
          if (data.task_expired || data.error.includes("not found") || data.error.includes("expired")) {
            const errorMsg = data.message || "Task has expired. Please restart the task to continue.";
            
            // Mark task as expired to prevent additional status checks
            taskExpiredRef.current = true;
            
            // Only show the error once
            if (lastErrorRef.current !== errorMsg) {
              lastErrorRef.current = errorMsg;
              setError(errorMsg);
            }
            
            setConnectionStatus("error");
            setTaskStatus('expired');
            setIsProcessing(false);
            
            // Update the database with the expired status
            await supabase
              .from('browser_automation_tasks')
              .update({ 
                status: 'expired',
                completed_at: new Date().toISOString()
              })
              .eq('id', currentTaskId);
              
            // Also update the history table
            await supabase
              .from('browser_task_history')
              .update({ 
                status: 'expired',
                completed_at: new Date().toISOString(),
                output: JSON.stringify({ error: errorMsg })
              })
              .eq('browser_task_id', browserTaskId);
            
            // Clear the interval
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
          
          // Other error types
          setError(data.error);
          return;
        }

        // Reset last error when there is no error
        lastErrorRef.current = null;

        // Process normal data
        if (data) {
          console.log("Task status data:", data);
          
          // Update status from the response
          if (data.status) {
            // Map finished to completed for consistency
            const normalizedStatus = data.status === 'finished' ? 'completed' : data.status;
            setTaskStatus(normalizedStatus as TaskStatus);
            
            // Update processing flag based on status
            if (["completed", "failed", "stopped"].includes(normalizedStatus)) {
              setIsProcessing(false);
              
              // Update the database with the final status
              await supabase
                .from('browser_automation_tasks')
                .update({ 
                  status: normalizedStatus,
                  completed_at: new Date().toISOString()
                })
                .eq('id', currentTaskId);
                
              // Also update the history table
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
                
              // Clear the interval on completion
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          }
          
          // Process live URL information
          if (data.live_url && !state.liveUrl) {
            console.log("Setting live URL from status endpoint:", data.live_url);
            setLiveUrl(data.live_url);
            
            // Update the database with the live URL
            await supabase
              .from('browser_automation_tasks')
              .update({ live_url: data.live_url })
              .eq('id', currentTaskId);
              
            // Also update the history table
            await supabase
              .from('browser_task_history')
              .update({ result_url: data.live_url })
              .eq('browser_task_id', browserTaskId);
          } else if (data.browser?.live_url && !state.liveUrl) {
            console.log("Setting live URL from browser data:", data.browser.live_url);
            setLiveUrl(data.browser.live_url);
            
            // Update the database with the live URL
            await supabase
              .from('browser_automation_tasks')
              .update({ live_url: data.browser.live_url })
              .eq('id', currentTaskId);
              
            // Also update the history table
            await supabase
              .from('browser_task_history')
              .update({ result_url: data.browser.live_url })
              .eq('browser_task_id', browserTaskId);
          }
          
          // Set current browsing URL if available
          if (data.current_url) {
            setCurrentUrl(data.current_url);
            
            // Update the database with the current URL
            await supabase
              .from('browser_automation_tasks')
              .update({ current_url: data.current_url })
              .eq('id', currentTaskId);
          }
          
          // Process progress information
          if (typeof data.progress === 'number') {
            const progressValue = data.progress;
            setProgress(progressValue);
            
            // Update the database with the progress
            await supabase
              .from('browser_automation_tasks')
              .update({ progress: progressValue })
              .eq('id', currentTaskId);
          } else if (data.steps && data.steps.length > 0) {
            // Calculate progress based on step count
            const progressValue = Math.min(Math.round((data.steps.length / 10) * 100), 95);
            setProgress(progressValue);
            
            // Update the database with the progress
            await supabase
              .from('browser_automation_tasks')
              .update({ progress: progressValue })
              .eq('id', currentTaskId);
          }
          
          // Set task steps if available
          if (data.steps && Array.isArray(data.steps)) {
            setTaskSteps(data.steps);
            
            // Store steps in the database (compress to avoid large data)
            const stepsJson = JSON.stringify(data.steps);
            await supabase
              .from('browser_automation_tasks')
              .update({ steps: stepsJson })
              .eq('id', currentTaskId);
          }
          
          // Set task output if available
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
            
            // Update the database with the output
            await supabase
              .from('browser_automation_tasks')
              .update({ output: formattedOutput })
              .eq('id', currentTaskId);
              
            // Also update the history table
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

    // Do an immediate first check
    pollStatus();

    // Set up the polling interval
    const pollInterval = taskStatus === 'running' ? 5000 : 3000; // Poll faster when not running
    intervalRef.current = setInterval(pollStatus, pollInterval) as unknown as number;

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentTaskId, isProcessing, taskStatus, state.liveUrl, setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing, setLiveUrl, setError, setConnectionStatus]);
}
