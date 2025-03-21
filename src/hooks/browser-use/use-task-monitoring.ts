import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStatus } from './types';

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
  setBrowserTaskId: (id: string | null) => void;
}

export function useTaskMonitoring(
  state: BrowserTaskState,
  setters: TaskMonitoringSetters
) {
  const { 
    currentTaskId, 
    isProcessing, 
    taskStatus,
    error: currentError
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
    setConnectionStatus,
    setBrowserTaskId
  } = setters;

  // Keep track of polling interval
  const pollingIntervalRef = useRef<number | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

  // Set up polling whenever a task is active
  useEffect(() => {
    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Start polling if we have an active task
    if (currentTaskId && isProcessing) {
      // Clear any existing polling
      clearPolling();

      // Start polling for task status
      const checkTaskStatus = async () => {
        try {
          // First, check our database for the browser_task_id
          const { data: taskData, error: taskError } = await supabase
            .from('browser_automation_tasks')
            .select('browser_task_id, status')
            .eq('id', currentTaskId)
            .single();

          if (taskError) {
            console.error("Error retrieving task data:", taskError);
            return;
          }

          // If we have a browser_task_id, update our state
          if (taskData?.browser_task_id) {
            setBrowserTaskId(taskData.browser_task_id);
          }

          // Call the API to get current task status
          const { data, error } = await supabase.functions.invoke('browser-use-api', {
            body: { 
              task_id: taskData?.browser_task_id || currentTaskId
            }
          });

          if (error) {
            console.error("Error checking task status:", error);
            // Increment retry count
            retryCountRef.current += 1;
            
            if (retryCountRef.current > MAX_RETRIES) {
              // If we've exceeded max retries, show error and stop polling
              setError(`Failed to get task status after ${MAX_RETRIES} attempts: ${error.message}`);
              setTaskStatus('failed');
              clearPolling();
            }
            return;
          }

          // Reset retry count on successful response
          retryCountRef.current = 0;

          // Process task data
          if (data) {
            // Update browser task ID if we didn't have it before
            if (data.id && !taskData?.browser_task_id) {
              setBrowserTaskId(data.id);
              
              // Update our database record with the browser_task_id
              await supabase
                .from('browser_automation_tasks')
                .update({ browser_task_id: data.id })
                .eq('id', currentTaskId);
            }

            // Update task status
            if (data.status) {
              let newStatus: TaskStatus = 'running';
              
              // Map API status to our internal status
              switch (data.status) {
                case 'created':
                case 'pending':
                  newStatus = 'pending';
                  break;
                case 'running':
                  newStatus = 'running';
                  break;
                case 'paused':
                  newStatus = 'paused';
                  break;
                case 'finished':
                  newStatus = 'completed';
                  setIsProcessing(false);
                  clearPolling(); // Stop polling when completed
                  break;
                case 'stopped':
                  newStatus = 'stopped';
                  setIsProcessing(false);
                  clearPolling(); // Stop polling when stopped
                  break;
                case 'failed':
                  newStatus = 'failed';
                  setError("Task failed on the server");
                  setIsProcessing(false);
                  clearPolling(); // Stop polling when failed
                  break;
                default:
                  console.warn(`Unknown status: ${data.status}`);
              }
              
              // Only update if status has changed
              if (lastStatusRef.current !== data.status) {
                console.log(`Task status changed: ${lastStatusRef.current} -> ${data.status}`);
                lastStatusRef.current = data.status;
                setTaskStatus(newStatus);
                
                // Update our database with the new status
                await supabase
                  .from('browser_automation_tasks')
                  .update({ 
                    status: newStatus,
                    ...(newStatus === 'completed' || newStatus === 'stopped' || newStatus === 'failed' 
                      ? { completed_at: new Date().toISOString() } 
                      : {})
                  })
                  .eq('id', currentTaskId);
                
                // Update browser_task_history table as well
                await supabase
                  .from('browser_task_history')
                  .update({ 
                    status: newStatus,
                    ...(newStatus === 'completed' || newStatus === 'stopped' || newStatus === 'failed' 
                      ? { completed_at: new Date().toISOString() } 
                      : {})
                  })
                  .eq('browser_task_id', data.id || taskData?.browser_task_id);
              }
            }

            // Update progress (calculate this or get it from API)
            if (data.steps && Array.isArray(data.steps)) {
              setTaskSteps(data.steps);
              // Calculate progress based on steps
              const completedSteps = data.steps.filter((step: any) => 
                step.status === 'completed' || step.status === 'success'
              ).length;
              const totalSteps = data.steps.length || 1;
              const progressPercentage = Math.floor((completedSteps / totalSteps) * 100);
              setProgress(progressPercentage);
            }

            // Update current URL
            if (data.browser && data.browser.current_url) {
              setCurrentUrl(data.browser.current_url);
            }

            // Update output
            if (data.output) {
              let output = typeof data.output === 'string' 
                ? data.output 
                : JSON.stringify(data.output, null, 2);
              setTaskOutput(output);
            }

            // Update live URL
            if (data.live_url || (data.browser && data.browser.live_url)) {
              const liveUrl = data.live_url || data.browser.live_url;
              setLiveUrl(liveUrl);
              
              // Update our database with the live URL
              await supabase
                .from('browser_automation_tasks')
                .update({ live_url: liveUrl })
                .eq('id', currentTaskId);
                
              // Update browser_task_history table as well
              await supabase
                .from('browser_task_history')
                .update({ result_url: liveUrl })
                .eq('browser_task_id', data.id || taskData?.browser_task_id);
            }
          } else if (data === null && !currentError) {
            // If we get null data but have a task ID, it might be expired
            setError("Task may have expired or been deleted. Please try restarting the task.");
            setTaskStatus('expired');
            setIsProcessing(false);
            clearPolling();
          }
        } catch (err) {
          console.error("Error in task monitoring:", err);
          // Don't increment retry count here, as this is likely a client-side error
        }
      };

      // Immediately check status once
      checkTaskStatus();
      
      // Then set up polling every 3 seconds
      pollingIntervalRef.current = window.setInterval(checkTaskStatus, 3000);
    } else if (!isProcessing || !currentTaskId) {
      // Clear polling if task is no longer active
      clearPolling();
    }

    // Clean up on unmount
    return () => {
      clearPolling();
    };
  }, [
    currentTaskId, 
    isProcessing, 
    setProgress, 
    setTaskStatus, 
    setCurrentUrl, 
    setTaskSteps,
    setTaskOutput,
    setIsProcessing,
    setLiveUrl,
    setError,
    setConnectionStatus,
    setBrowserTaskId,
    currentError
  ]);
}
