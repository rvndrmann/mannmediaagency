
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
    error: currentError,
    browserTaskId: currentBrowserTaskId
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
  const lastBrowserTaskIdRef = useRef<string | null>(null);
  const MAX_RETRIES = 3;

  // Set up polling whenever a task is active
  useEffect(() => {
    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Track if the browser task ID has changed
    if (currentBrowserTaskId !== lastBrowserTaskIdRef.current) {
      console.log(`Browser task ID changed from ${lastBrowserTaskIdRef.current} to ${currentBrowserTaskId}`);
      lastBrowserTaskIdRef.current = currentBrowserTaskId;
      // Reset status tracking when task ID changes
      lastStatusRef.current = null;
    }

    // Start polling if we have an active task
    if ((currentTaskId || currentBrowserTaskId) && isProcessing) {
      // Clear any existing polling
      clearPolling();

      // Start polling for task status
      const checkTaskStatus = async () => {
        try {
          // Choose the task ID to use - prefer browserTaskId if available
          const taskIdToUse = currentBrowserTaskId || currentTaskId;
          
          if (!taskIdToUse) {
            console.warn("No task ID available for monitoring");
            return;
          }
          
          console.log(`Checking status for task: ${taskIdToUse}`);
          setConnectionStatus('checking');

          // First, if we have a local task ID but no browser task ID, check the database
          if (currentTaskId && !currentBrowserTaskId) {
            const { data: taskData, error: taskError } = await supabase
              .from('browser_automation_tasks')
              .select('browser_task_id, status')
              .eq('id', currentTaskId)
              .single();

            if (taskError) {
              console.error("Error retrieving task data:", taskError);
            } else if (taskData?.browser_task_id) {
              console.log(`Retrieved browser_task_id from database: ${taskData.browser_task_id}`);
              setBrowserTaskId(taskData.browser_task_id);
              // We'll continue with the API call using the local task ID this time
              // Next cycle will use the browser task ID
            }
          }

          // Call the API to get current task status
          const { data, error } = await supabase.functions.invoke('browser-use-api', {
            body: { 
              task_id: taskIdToUse
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
              setConnectionStatus('error');
              clearPolling();
            } else {
              setConnectionStatus('retry');
            }
            return;
          }

          // Reset retry count on successful response
          retryCountRef.current = 0;
          setConnectionStatus('connected');

          // Process task data
          if (data) {
            // If we're monitoring using the local task ID but the API returns a browser task ID
            if (currentTaskId && !currentBrowserTaskId && data.id) {
              console.log(`Setting browser_task_id from API response: ${data.id}`);
              setBrowserTaskId(data.id);
              
              // Update our database record with the browser_task_id
              await supabase
                .from('browser_automation_tasks')
                .update({ browser_task_id: data.id })
                .eq('id', currentTaskId);
                
              // Also ensure the browser_task_history table is updated
              await supabase
                .from('browser_task_history')
                .update({ browser_task_id: data.id })
                .eq('task_input', state.taskInput)
                .is('browser_task_id', null);
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
                
                // Define the updates for both tables
                const statusUpdateData = { 
                  status: newStatus,
                  ...(newStatus === 'completed' || newStatus === 'stopped' || newStatus === 'failed' 
                    ? { completed_at: new Date().toISOString() } 
                    : {})
                };
                
                // Perform updates in parallel
                const updatePromises = [];
                
                // Update our database with the new status if we have the local task ID
                if (currentTaskId) {
                  updatePromises.push(
                    supabase
                      .from('browser_automation_tasks')
                      .update(statusUpdateData)
                      .eq('id', currentTaskId)
                  );
                }
                
                // Update browser_task_history table as well using the browser task ID
                if (currentBrowserTaskId || data.id) {
                  const browserTaskIdToUse = currentBrowserTaskId || data.id;
                  updatePromises.push(
                    supabase
                      .from('browser_task_history')
                      .update(statusUpdateData)
                      .eq('browser_task_id', browserTaskIdToUse)
                  );
                }
                
                // Execute all updates
                await Promise.all(updatePromises);
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
              
              // Update database with progress if we have the local task ID
              if (currentTaskId) {
                await supabase
                  .from('browser_automation_tasks')
                  .update({ progress: progressPercentage })
                  .eq('id', currentTaskId);
              }
            }

            // Update current URL
            if (data.browser && data.browser.current_url) {
              setCurrentUrl(data.browser.current_url);
            }

            // Update output and browser data
            if (data.output || data.browser_data) {
              let output = typeof data.output === 'string' 
                ? data.output 
                : JSON.stringify(data.output, null, 2);
              setTaskOutput(output);
              
              // Update database with output and browser data
              const updateData: any = {};
              
              if (output) {
                updateData.output = output;
              }
              
              if (data.browser_data) {
                updateData.browser_data = data.browser_data;
              }
              
              // Only update if we have something to update
              if (Object.keys(updateData).length > 0) {
                const updatePromises = [];
                
                // Update main tasks table
                if (currentTaskId) {
                  updatePromises.push(
                    supabase
                      .from('browser_automation_tasks')
                      .update(updateData)
                      .eq('id', currentTaskId)
                  );
                }
                
                // Update history table
                if (currentBrowserTaskId || data.id) {
                  const browserTaskIdToUse = currentBrowserTaskId || data.id;
                  updatePromises.push(
                    supabase
                      .from('browser_task_history')
                      .update(updateData)
                      .eq('browser_task_id', browserTaskIdToUse)
                  );
                }
                
                await Promise.all(updatePromises);
              }
            }

            // Update live URL
            if (data.live_url || (data.browser && data.browser.live_url)) {
              const liveUrl = data.live_url || (data.browser && data.browser.live_url);
              
              if (liveUrl) {
                setLiveUrl(liveUrl);
                
                const updatePromises = [];
                
                // Update main tasks table with the live URL
                if (currentTaskId) {
                  updatePromises.push(
                    supabase
                      .from('browser_automation_tasks')
                      .update({ live_url: liveUrl })
                      .eq('id', currentTaskId)
                  );
                }
                  
                // Update browser_task_history table as well
                if (currentBrowserTaskId || data.id) {
                  const browserTaskIdToUse = currentBrowserTaskId || data.id;
                  updatePromises.push(
                    supabase
                      .from('browser_task_history')
                      .update({ result_url: liveUrl })
                      .eq('browser_task_id', browserTaskIdToUse)
                  );
                }
                
                await Promise.all(updatePromises);
              }
            }
          } else if (data === null && !currentError) {
            // If we get null data but have a task ID, it might be expired
            setError("Task may have expired or been deleted. Please try restarting the task.");
            setTaskStatus('expired');
            setIsProcessing(false);
            setConnectionStatus('error');
            clearPolling();
          }
        } catch (err) {
          console.error("Error in task monitoring:", err);
          setConnectionStatus('error');
          // Don't increment retry count here, as this is likely a client-side error
        }
      };

      // Immediately check status once
      checkTaskStatus();
      
      // Then set up polling every 3 seconds
      pollingIntervalRef.current = window.setInterval(checkTaskStatus, 3000);
    } else if (!isProcessing || (!currentTaskId && !currentBrowserTaskId)) {
      // Clear polling if task is no longer active
      clearPolling();
    }

    // Clean up on unmount
    return () => {
      clearPolling();
    };
  }, [
    currentTaskId, 
    currentBrowserTaskId,
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
    currentError,
    state.taskInput
  ]);
}
