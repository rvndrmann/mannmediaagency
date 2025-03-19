
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStatus } from "./types";
import { toast } from "sonner";

interface TaskStateSetters {
  setProgress: (progress: number) => void;
  setTaskStatus: (status: TaskStatus) => void;
  setCurrentUrl: (url: string | null) => void;
  setTaskSteps: (steps: BrowserTaskState["steps"]) => void;
  setTaskOutput: (output: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setLiveUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
}

export function useTaskMonitoring(
  state: BrowserTaskState,
  stateSetters: TaskStateSetters
) {
  const { currentTaskId, taskStatus } = state;
  const {
    setProgress,
    setTaskStatus,
    setCurrentUrl,
    setTaskSteps,
    setTaskOutput,
    setIsProcessing,
    setLiveUrl,
    setError,
  } = stateSetters;
  
  const pollingIntervalRef = useRef<number | null>(null);
  
  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Set up polling for task status
  useEffect(() => {
    // Clear any existing intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (!state.currentTaskId) return;
    
    console.log(`Starting monitoring for task: ${state.currentTaskId}`);
    
    // Function to fetch task details and steps
    const fetchTaskDetails = async () => {
      try {
        console.log(`Fetching task details for ID: ${state.currentTaskId}`);
        const { data: taskData, error: taskError } = await supabase
          .from("browser_automation_tasks")
          .select("id, progress, status, current_url, output, live_url, browser_task_id, completed_at, browser_data")
          .eq("id", state.currentTaskId)
          .single();
          
        if (taskError) {
          console.error("Error fetching task details:", taskError);
          setError(`Error fetching task details: ${taskError.message}`);
          return;
        }
        
        if (!taskData) {
          console.warn(`No task data found for ID: ${state.currentTaskId}`);
          return;
        }
        
        console.log(`Task data:`, taskData);
        
        // Update state with task data
        setProgress(taskData.progress || 0);
        setTaskStatus(taskData.status);
        
        if (taskData.current_url) {
          setCurrentUrl(taskData.current_url);
        }
        
        if (taskData.output) {
          setTaskOutput(taskData.output);
        }
        
        if (taskData.live_url) {
          console.log(`Setting live URL: ${taskData.live_url}`);
          setLiveUrl(taskData.live_url);
        }
        
        // Fetch steps for this task
        const { data: stepsData, error: stepsError } = await supabase
          .from("browser_automation_steps")
          .select("*")
          .eq("task_id", state.currentTaskId)
          .order("created_at", { ascending: true });
          
        if (stepsError) {
          console.error("Error fetching task steps:", stepsError);
        } else if (stepsData) {
          setTaskSteps(stepsData);
        }
        
        // If the task is not in an active state, stop polling
        if (["completed", "failed", "stopped"].includes(taskData.status)) {
          console.log(`Task ${state.currentTaskId} is in final state: ${taskData.status}. Stopping polling.`);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setIsProcessing(false);
          
          if (taskData.status === "failed") {
            let errorMsg = "Task failed";
            
            try {
              if (taskData.output) {
                const parsedOutput = JSON.parse(taskData.output);
                if (parsedOutput?.error) {
                  errorMsg = parsedOutput.error;
                }
              }
            } catch (e) {
              console.error("Error parsing task output:", e);
            }
            
            toast.error(errorMsg);
            setError(errorMsg);
          } else if (taskData.status === "completed") {
            toast.success("Task completed successfully");
          } else if (taskData.status === "stopped") {
            toast.info("Task stopped");
          }
          
          return;
        }
        
        // If task is pending or running, check with browser-use API for updates
        if (["pending", "running", "created", "paused"].includes(taskData.status)) {
          console.log(`Task ${state.currentTaskId} is active. Checking API for updates.`);
          
          try {
            // Check if we already have a browser_task_id, if not, we need to wait
            if (!taskData.browser_task_id) {
              console.log(`No browser_task_id yet for task ${state.currentTaskId}. Waiting...`);
              return;
            }
            
            // Use the edge function to fetch the latest status
            const { data: apiResponse, error: apiError } = await supabase.functions.invoke(
              "browser-use-api",
              {
                body: { task_id: taskData.browser_task_id }
              }
            );
            
            console.log(`API response for task ${taskData.browser_task_id}:`, apiResponse);
            
            if (apiError) {
              console.error("API error:", apiError);
              return;
            }
            
            if (apiResponse.error) {
              console.error("API returned error:", apiResponse.error);
              
              // Handle expired/deleted tasks
              if (apiResponse.error.includes("not found") || apiResponse.status === "failed") {
                await supabase
                  .from("browser_automation_tasks")
                  .update({
                    status: "failed",
                    output: JSON.stringify({ error: apiResponse.error }),
                    completed_at: new Date().toISOString()
                  })
                  .eq("id", state.currentTaskId);
                  
                setTaskStatus("failed");
                setIsProcessing(false);
                setError(apiResponse.error);
                toast.error(apiResponse.error);
                
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }
              
              return;
            }
            
            // Process API response
            if (apiResponse) {
              // Calculate progress
              let calculatedProgress = 0;
              if (apiResponse.progress) {
                calculatedProgress = apiResponse.progress;
              } else if (apiResponse.status === "completed") {
                calculatedProgress = 100;
              }
              
              // Get live URL if available
              let liveUrl = null;
              if (apiResponse.browser && apiResponse.browser.live_url) {
                liveUrl = apiResponse.browser.live_url;
                console.log(`Live URL from API: ${liveUrl}`);
              }
              
              // Get current URL if available
              let currentUrl = null;
              if (apiResponse.browser && apiResponse.browser.current_url) {
                currentUrl = apiResponse.browser.current_url;
              }
              
              // Check for recordings
              let recordingUrl = null;
              if (apiResponse.recordings && apiResponse.recordings.length > 0) {
                // Use the most recent recording
                const latestRecording = apiResponse.recordings.reduce((latest, current) => {
                  if (!latest.created_at || new Date(current.created_at) > new Date(latest.created_at)) {
                    return current;
                  }
                  return latest;
                }, {});
                
                recordingUrl = latestRecording.url;
                console.log(`Recording URL: ${recordingUrl}`);
              }
              
              // Determine which URL to use for the live preview (prefer live_url, then recording, then null)
              const effectiveLiveUrl = liveUrl || recordingUrl || null;
              
              // Map API status to our status
              const statusMap = {
                "created": "created",
                "pending": "pending",
                "in_progress": "running",
                "completed": "completed",
                "failed": "failed",
                "paused": "paused",
                "stopped": "stopped"
              };
              
              const mappedStatus = statusMap[apiResponse.status] || apiResponse.status;
              
              // Update task in database
              await supabase
                .from("browser_automation_tasks")
                .update({
                  progress: calculatedProgress,
                  status: mappedStatus,
                  current_url: currentUrl,
                  live_url: effectiveLiveUrl,
                  browser_data: apiResponse,
                  ...(["completed", "failed", "stopped"].includes(mappedStatus) 
                    ? { completed_at: new Date().toISOString() } 
                    : {})
                })
                .eq("id", currentTaskId);
                
              // Update state
              setProgress(calculatedProgress);
              setTaskStatus(mappedStatus);
              
              if (currentUrl) {
                setCurrentUrl(currentUrl);
              }
              
              if (effectiveLiveUrl) {
                console.log(`Setting effective live URL: ${effectiveLiveUrl}`);
                setLiveUrl(effectiveLiveUrl);
              }
              
              // If there are steps in the API response, add them to our database
              if (apiResponse.steps && Array.isArray(apiResponse.steps)) {
                console.log(`Processing ${apiResponse.steps.length} steps from API`);
                
                for (const step of apiResponse.steps) {
                  // Check if this step already exists
                  const { data: existingStep } = await supabase
                    .from("browser_automation_steps")
                    .select("id")
                    .eq("task_id", currentTaskId)
                    .eq("description", step.description)
                    .maybeSingle();
                    
                  if (!existingStep) {
                    await supabase.from("browser_automation_steps").insert({
                      task_id: currentTaskId,
                      description: step.description,
                      status: step.status || "completed",
                      details: step.details || null
                    });
                  }
                }
                
                // Refresh steps after adding new ones
                const { data: updatedSteps } = await supabase
                  .from("browser_automation_steps")
                  .select("*")
                  .eq("task_id", currentTaskId)
                  .order("created_at", { ascending: true });
                  
                if (updatedSteps) {
                  setTaskSteps(updatedSteps);
                }
              }
              
              // If task is complete, stop polling
              if (["completed", "failed", "stopped"].includes(mappedStatus)) {
                console.log(`Task ${currentTaskId} is in final state from API: ${mappedStatus}. Stopping polling.`);
                
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                setIsProcessing(false);
                
                if (mappedStatus === "failed") {
                  toast.error("Task failed");
                  setError("Task failed");
                } else if (mappedStatus === "completed") {
                  toast.success("Task completed successfully");
                } else if (mappedStatus === "stopped") {
                  toast.info("Task stopped");
                }
              }
            }
          } catch (apiCheckError) {
            console.error("Error checking API status:", apiCheckError);
          }
        }
      } catch (error) {
        console.error("Error in task monitoring:", error);
      }
    };
    
    // Immediately fetch task details
    fetchTaskDetails();
    
    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(fetchTaskDetails, 5000) as unknown as number;
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [state.currentTaskId, state.taskStatus]);
}
