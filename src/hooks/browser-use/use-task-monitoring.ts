
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStep } from "./types";
import { toast } from "sonner";

export function useTaskMonitoring(
  state: BrowserTaskState,
  setState: {
    setProgress: (value: number) => void;
    setTaskStatus: (value: any) => void;
    setCurrentUrl: (value: string | null) => void;
    setTaskSteps: (value: TaskStep[]) => void;
    setTaskOutput: (value: string | null) => void;
    setIsProcessing: (value: boolean) => void;
    setLiveUrl: (value: string | null) => void;
    setError: (value: string | null) => void;
  }
) {
  const { currentTaskId } = state;
  const { 
    setProgress, 
    setTaskStatus, 
    setCurrentUrl, 
    setTaskSteps, 
    setTaskOutput, 
    setIsProcessing,
    setLiveUrl,
    setError
  } = setState;

  // Set up polling for task updates
  useEffect(() => {
    if (currentTaskId) {
      console.log(`Setting up task monitoring for task ID: ${currentTaskId}`);
      const intervalId = setInterval(async () => {
        try {
          // 1. First, check the task in the database
          const { data: taskData, error: taskError } = await supabase
            .from('browser_automation_tasks')
            .select('id, progress, status, current_url, output, live_url, browser_task_id, completed_at, browser_data')
            .eq('id', currentTaskId)
            .maybeSingle();
          
          if (taskError) throw taskError;
          
          if (taskData) {
            console.log(`Task data from DB:`, taskData);
            
            // Set available data from the database
            setProgress(taskData.progress || 0);
            setTaskStatus(taskData.status || 'idle');
            
            if (taskData.current_url && typeof taskData.current_url === 'string') {
              setCurrentUrl(taskData.current_url);
            }
            
            if (taskData.live_url && typeof taskData.live_url === 'string') {
              console.log(`Setting live URL from DB: ${taskData.live_url}`);
              setLiveUrl(taskData.live_url);
            }
            
            if (taskData.output) {
              setTaskOutput(taskData.output);
            }
            
            // 2. If the task is still running, paused, pending, or created, call the browser-use-api to get the latest status
            // Make sure browser_task_id is populated
            const browserTaskId = taskData.browser_task_id;
            
            if (['running', 'paused', 'pending', 'created'].includes(taskData.status)) {
              // Log task status before API call
              console.log(`Checking status for task ${currentTaskId}, using browserTaskId: ${browserTaskId || 'undefined'}`);

              if (!browserTaskId) {
                console.warn(`No browser_task_id found for task ${currentTaskId}, using task ID as fallback`);
              }

              const taskIdToUse = browserTaskId || currentTaskId;
              console.log(`Making API call with task_id: ${taskIdToUse}`);

              // Fetch the latest task status from the API
              const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
                body: { task_id: taskIdToUse }
              });
              
              if (apiError) {
                console.error("Error fetching task status from API:", apiError);
                
                // Don't give up on first error - this could be transient
                if (apiError.message.includes("Agent session not found")) {
                  // Check if we have a task ID in the database but not in the API
                  // This might happen if the task was created but the API doesn't know about it
                  if (!browserTaskId && taskData.id) {
                    // Try to update the browser_task_id in the database with the current task ID
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ browser_task_id: taskData.id })
                      .eq('id', currentTaskId);
                    
                    console.log(`Updated browser_task_id to match task ID: ${taskData.id}`);
                  }
                }
              } else if (apiResponse) {
                console.log("Received task status update:", apiResponse);
                
                // Check for API error response
                if (apiResponse.error) {
                  console.error("API Error:", apiResponse.error);
                  
                  if (apiResponse.error.includes("Agent session not found")) {
                    // Handle expired or deleted tasks gracefully
                    toast.error("Task session expired or not found. Please start a new task.");
                    setError("Task session expired or not found. Please start a new task.");
                    
                    // Update task status in database
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ 
                        status: 'failed',
                        output: JSON.stringify({ error: apiResponse.error }),
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', currentTaskId);
                    
                    setTaskStatus('failed');
                    setIsProcessing(false);
                    
                    clearInterval(intervalId);
                    return;
                  }
                }
                
                // Update browser_task_id if it wasn't set before but we got a task_id in the response
                if (!browserTaskId && apiResponse.task_id) {
                  console.log(`Setting browser_task_id from API response: ${apiResponse.task_id}`);
                  
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ browser_task_id: apiResponse.task_id })
                    .eq('id', currentTaskId);
                }
                
                // Update live_url if it exists in the API response
                if (apiResponse.live_url && typeof apiResponse.live_url === 'string') {
                  console.log("Setting live URL from API:", apiResponse.live_url);
                  setLiveUrl(apiResponse.live_url);
                  
                  // Also update the database with the live URL
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ live_url: apiResponse.live_url })
                    .eq('id', currentTaskId);
                } else if (apiResponse.browser && apiResponse.browser.live_url) {
                  // Also check for live_url in browser object
                  console.log("Setting live URL from browser object:", apiResponse.browser.live_url);
                  setLiveUrl(apiResponse.browser.live_url);
                  
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ live_url: apiResponse.browser.live_url })
                    .eq('id', currentTaskId);
                }

                // Check for recordings array in the response
                if (apiResponse.recordings && apiResponse.recordings.length > 0) {
                  const recordingUrl = apiResponse.recordings[0];
                  console.log("Found recording, setting as live URL:", recordingUrl);
                  setLiveUrl(recordingUrl);
                  
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ live_url: recordingUrl })
                    .eq('id', currentTaskId);
                }
                
                // Update other task data if available
                if (apiResponse.status) {
                  setTaskStatus(apiResponse.status);
                  
                  // If task is finished, update the completed_at timestamp
                  if (['completed', 'finished', 'failed', 'stopped'].includes(apiResponse.status)) {
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ 
                        status: apiResponse.status,
                        completed_at: new Date().toISOString(),
                        browser_data: apiResponse.browser || null
                      })
                      .eq('id', currentTaskId);
                  }
                }
                
                if (apiResponse.current_url) {
                  setCurrentUrl(apiResponse.current_url);
                  
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ current_url: apiResponse.current_url })
                    .eq('id', currentTaskId);
                }
                
                if (apiResponse.output) {
                  const outputText = typeof apiResponse.output === 'string' ? 
                                    apiResponse.output : 
                                    JSON.stringify(apiResponse.output, null, 2);
                  setTaskOutput(outputText);
                  
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ output: outputText })
                    .eq('id', currentTaskId);
                }
              }
            } else if (['finished', 'failed', 'stopped', 'completed'].includes(taskData.status) && !taskData.live_url && browserTaskId) {
              // For completed tasks that don't have a live URL yet, try to fetch media one more time
              console.log(`Task ${currentTaskId} is completed but has no live URL, checking for recordings...`);
              try {
                const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
                  body: { task_id: browserTaskId }
                });
                
                if (!apiError && apiResponse) {
                  if (apiResponse.recordings && apiResponse.recordings.length > 0) {
                    console.log("Retrieved recordings for completed task:", apiResponse.recordings);
                    const recordingUrl = apiResponse.recordings[0];
                    console.log("Setting recording URL as live URL for completed task:", recordingUrl);
                    setLiveUrl(recordingUrl);
                    
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ live_url: recordingUrl })
                      .eq('id', currentTaskId);
                  }
                  else if (apiResponse.browser && apiResponse.browser.live_url) {
                    console.log("Setting live URL from browser object for completed task:", apiResponse.browser.live_url);
                    setLiveUrl(apiResponse.browser.live_url);
                    
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ live_url: apiResponse.browser.live_url })
                      .eq('id', currentTaskId);
                  }
                }
              } catch (mediaError) {
                console.error("Error fetching media for completed task:", mediaError);
              }
            }
            
            // Get steps with specific column selection
            const { data: stepsData, error: stepsError } = await supabase
              .from('browser_automation_steps')
              .select('id, task_id, description, status, details, screenshot, created_at')
              .eq('task_id', currentTaskId)
              .order('created_at', { ascending: true });
            
            if (stepsError) throw stepsError;
            
            if (stepsData) {
              setTaskSteps(stepsData.map(step => ({
                ...step,
                details: typeof step.details === 'string' ? step.details : 
                        step.details ? JSON.stringify(step.details) : null,
                status: (step.status as 'pending' | 'completed' | 'failed') || 'pending'
              })));
            }
            
            if (['finished', 'failed', 'stopped', 'completed'].includes(taskData.status)) {
              clearInterval(intervalId);
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error("Error fetching task:", error);
          setError(`Error updating task status: ${error.message || "Unknown error"}`);
        }
      }, 3000);
      
      return () => clearInterval(intervalId);
    }
  }, [currentTaskId, setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing, setLiveUrl, setError]);
}
