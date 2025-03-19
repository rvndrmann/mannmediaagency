
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
    setLiveUrl: (value: string | null) => void;
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
    setLiveUrl 
  } = setState;

  // Set up polling for task updates
  useEffect(() => {
    if (currentTaskId) {
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
            // Set available data from the database
            setProgress(taskData.progress || 0);
            setTaskStatus(taskData.status || 'idle');
            
            if (taskData.current_url && typeof taskData.current_url === 'string') {
              setCurrentUrl(taskData.current_url);
            }
            
            if (taskData.live_url && typeof taskData.live_url === 'string') {
              setLiveUrl(taskData.live_url);
            }
            
            if (taskData.output) {
              setTaskOutput(taskData.output);
            }
            
            // 2. If the task is still running, paused, pending, or created, call the browser-use-api to get the latest status
            if (['running', 'paused', 'pending', 'created'].includes(taskData.status)) {
              // Log the browser_task_id we're checking
              console.log(`Checking status for browser task ID: ${taskData.browser_task_id || 'undefined'}`);

              // Fetch the latest task status from the API
              const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api/status', {
                body: { task_id: taskData.browser_task_id || currentTaskId }
              });
              
              if (apiError) {
                console.error("Error fetching task status from API:", apiError);
              } else if (apiResponse) {
                console.log("Received task status update:", apiResponse);
                
                // Update live_url if it exists in the API response
                if (apiResponse.live_url && typeof apiResponse.live_url === 'string') {
                  setLiveUrl(apiResponse.live_url);
                  
                  // Also update the database with the live URL
                  await supabase
                    .from('browser_automation_tasks')
                    .update({ live_url: apiResponse.live_url })
                    .eq('id', currentTaskId);
                    
                  console.log("Updated live URL from API:", apiResponse.live_url);
                }
                
                // Update other task data if available
                if (apiResponse.status) {
                  setTaskStatus(apiResponse.status);
                  
                  // If task is finished, update the completed_at timestamp
                  if (['completed', 'finished', 'failed'].includes(apiResponse.status)) {
                    await supabase
                      .from('browser_automation_tasks')
                      .update({ 
                        status: apiResponse.status,
                        completed_at: new Date().toISOString(),
                        browser_data: apiResponse.browser || null
                      })
                      .eq('id', currentTaskId);
                      
                    // Try to fetch recordings/media if the task is complete
                    if (taskData.browser_task_id) {
                      try {
                        const { data: mediaResponse } = await supabase.functions.invoke('browser-use-api/media', {
                          body: { task_id: taskData.browser_task_id }
                        });
                        
                        if (mediaResponse && mediaResponse.recordings && mediaResponse.recordings.length > 0) {
                          console.log("Retrieved recordings:", mediaResponse.recordings);
                          
                          // Store the first recording URL as output if we don't have a live URL
                          if (!taskData.live_url) {
                            const recordingUrl = mediaResponse.recordings[0];
                            setLiveUrl(recordingUrl);
                            
                            await supabase
                              .from('browser_automation_tasks')
                              .update({ live_url: recordingUrl })
                              .eq('id', currentTaskId);
                          }
                        }
                      } catch (mediaError) {
                        console.error("Error fetching media:", mediaError);
                      }
                    }
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
                status: step.status || 'pending'
              })));
            }
            
            if (['finished', 'failed', 'stopped', 'completed'].includes(taskData.status)) {
              clearInterval(intervalId);
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error("Error fetching task:", error);
        }
      }, 3000);
      
      return () => clearInterval(intervalId);
    }
  }, [currentTaskId, setProgress, setTaskStatus, setCurrentUrl, setTaskSteps, setTaskOutput, setIsProcessing, setLiveUrl]);
}
