
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

  useEffect(() => {
    // Only set up polling if there's a task ID and the task is processing
    if (!currentTaskId || !isProcessing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset error count when starting monitoring
    errorCountRef.current = 0;
    
    // Start task polling at different rates based on status
    const pollStatus = async () => {
      try {
        // Check for media first if we don't have a live URL
        if (!state.liveUrl) {
          try {
            const { data: mediaData, error: mediaError } = await supabase.functions.invoke('browser-use-api', {
              body: {
                task_id: currentTaskId,
                url_check_only: true
              }
            });

            if (mediaError) {
              console.error("Error fetching media URL:", mediaError);
            } else if (mediaData?.recording_url) {
              console.log("Setting live URL from media endpoint:", mediaData.recording_url);
              setLiveUrl(mediaData.recording_url);
            } else if (mediaData?.live_url) {
              console.log("Setting live URL from media endpoint:", mediaData.live_url);
              setLiveUrl(mediaData.live_url);
            }
          } catch (mediaCheckError) {
            console.error("Error checking media:", mediaCheckError);
          }
        }

        // Check overall task status
        const { data, error: apiError } = await supabase.functions.invoke('browser-use-api', {
          body: { task_id: currentTaskId }
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
            
            // Only show the error once
            if (lastErrorRef.current !== errorMsg) {
              lastErrorRef.current = errorMsg;
              setError(errorMsg);
            }
            
            setConnectionStatus("error");
            setTaskStatus('expired');
            setIsProcessing(false);
            
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
            }
          }
          
          // Process live URL information
          if (data.live_url && !state.liveUrl) {
            console.log("Setting live URL from status endpoint:", data.live_url);
            setLiveUrl(data.live_url);
          } else if (data.browser?.live_url && !state.liveUrl) {
            console.log("Setting live URL from browser data:", data.browser.live_url);
            setLiveUrl(data.browser.live_url);
          }
          
          // Set current browsing URL if available
          if (data.current_url) {
            setCurrentUrl(data.current_url);
          }
          
          // Process progress information
          if (typeof data.progress === 'number') {
            setProgress(data.progress);
          } else if (data.steps && data.steps.length > 0) {
            // Calculate progress based on step count
            setProgress(Math.min(Math.round((data.steps.length / 10) * 100), 95));
          }
          
          // Set task steps if available
          if (data.steps && Array.isArray(data.steps)) {
            setTaskSteps(data.steps);
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
            
            setTaskOutput(typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output));
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
