
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskState, TaskStatus } from "./types";
import { toast } from "sonner";

interface TaskStateSetters {
  setProgress: (progress: number) => void;
  setTaskStatus: (status: TaskStatus) => void;
  setCurrentUrl: (url: string | null) => void;
  setTaskSteps: (steps: BrowserTaskState["taskSteps"]) => void;
  setTaskOutput: (output: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setLiveUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setConnectionStatus?: (status: BrowserTaskState["connectionStatus"]) => void;
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
    setConnectionStatus
  } = stateSetters;
  
  // Change from number to NodeJS.Timeout
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const urlCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (urlCheckIntervalRef.current) {
        clearInterval(urlCheckIntervalRef.current);
      }
    };
  }, []);
  
  // Set up aggressive polling for live URL specifically
  useEffect(() => {
    if (!state.currentTaskId || !['pending', 'running', 'created'].includes(state.taskStatus)) return;
    
    // Clear any existing URL check interval
    if (urlCheckIntervalRef.current) {
      clearInterval(urlCheckIntervalRef.current);
      urlCheckIntervalRef.current = null;
    }
    
    console.log(`Starting aggressive URL polling for task: ${state.currentTaskId}`);
    if (setConnectionStatus) setConnectionStatus("connecting");
    
    // Function to check specifically for live URL
    const checkForLiveUrl = async () => {
      try {
        const { data: taskData, error: taskError } = await supabase
          .from("browser_automation_tasks")
          .select("browser_task_id, live_url")
          .eq("id", state.currentTaskId)
          .single();
          
        if (taskError) {
          console.error("Error fetching task for URL check:", taskError);
          return;
        }
        
        if (!taskData || !taskData.browser_task_id) {
          console.log("No browser_task_id yet, waiting...");
          return;
        }
        
        // Check API directly for live URL
        const { data: apiResponse, error: apiError } = await supabase.functions.invoke(
          "browser-use-api",
          {
            body: { task_id: taskData.browser_task_id, url_check_only: true }
          }
        );
        
        if (apiError) {
          console.error("API error during URL check:", apiError);
          return;
        }
        
        if (apiResponse.error) {
          console.warn("API returned error during URL check:", apiResponse.error);
          return;
        }
        
        // Extract live URL or recording URL from response
        let effectiveUrl = null;
        
        if (apiResponse.browser && apiResponse.browser.live_url) {
          effectiveUrl = apiResponse.browser.live_url;
          console.log(`Found live URL in aggressive polling: ${effectiveUrl}`);
          if (setConnectionStatus) setConnectionStatus("connected");
        } else if (apiResponse.recordings && apiResponse.recordings.length > 0) {
          // Use the most recent recording
          const latestRecording = apiResponse.recordings.reduce((latest: any, current: any) => {
            if (!latest.created_at || new Date(current.created_at) > new Date(latest.created_at)) {
              return current;
            }
            return latest;
          }, {});
          
          effectiveUrl = latestRecording.url;
          console.log(`Found recording URL in aggressive polling: ${effectiveUrl}`);
        }
        
        // If we found a URL and it's different from what we have, update it
        if (effectiveUrl && effectiveUrl !== state.liveUrl) {
          console.log(`Setting new live URL from aggressive polling: ${effectiveUrl}`);
          setLiveUrl(effectiveUrl);
          
          await supabase
            .from("browser_automation_tasks")
            .update({ live_url: effectiveUrl })
            .eq("id", state.currentTaskId);
            
          // If we found a URL, we can slow down the polling
          if (urlCheckIntervalRef.current) {
            clearInterval(urlCheckIntervalRef.current);
            urlCheckIntervalRef.current = setInterval(checkForLiveUrl, 10000); // Switch to 10s intervals
            console.log("Slowing down URL polling to 10s intervals after finding URL");
          }
        }
      } catch (error) {
        console.error("Error in aggressive URL polling:", error);
      }
    };
    
    // Check immediately
    checkForLiveUrl();
    
    // Check every 2 seconds for the first minute
    urlCheckIntervalRef.current = setInterval(checkForLiveUrl, 2000);
    
    // After 60 seconds, clear the interval to avoid excessive API calls
    setTimeout(() => {
      if (urlCheckIntervalRef.current) {
        console.log("Stopping aggressive URL polling after 60 seconds");
        clearInterval(urlCheckIntervalRef.current);
        urlCheckIntervalRef.current = null;
      }
    }, 60000);
    
    return () => {
      if (urlCheckIntervalRef.current) {
        clearInterval(urlCheckIntervalRef.current);
        urlCheckIntervalRef.current = null;
      }
    };
  }, [state.currentTaskId, state.taskStatus, state.liveUrl, setLiveUrl, setConnectionStatus]);
  
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
          if (setConnectionStatus) setConnectionStatus("error");
          return;
        }
        
        if (!taskData) {
          console.warn(`No task data found for ID: ${state.currentTaskId}`);
          return;
        }
        
        console.log(`Task data:`, taskData);
        
        // Update state with task data
        setProgress(taskData.progress || 0);
        setTaskStatus(taskData.status as TaskStatus);
        
        if (taskData.current_url) {
          setCurrentUrl(taskData.current_url);
        }
        
        if (taskData.output) {
          setTaskOutput(taskData.output);
        }
        
        if (taskData.live_url) {
          console.log(`Setting live URL from DB: ${taskData.live_url}`);
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
          
          if (urlCheckIntervalRef.current) {
            clearInterval(urlCheckIntervalRef.current);
            urlCheckIntervalRef.current = null;
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
            if (setConnectionStatus) setConnectionStatus("error");
          } else if (taskData.status === "completed") {
            toast.success("Task completed successfully");
            if (setConnectionStatus) setConnectionStatus("disconnected");
          } else if (taskData.status === "stopped") {
            toast.info("Task stopped");
            if (setConnectionStatus) setConnectionStatus("disconnected");
          }
          
          return;
        }
        
        // If task is pending or running, check with browser-use API for updates
        if (["pending", "running", "created", "paused"].includes(taskData.status)) {
          console.log(`Task ${state.currentTaskId} is active. Checking API for updates.`);
          
          if (taskData.status === "running" && setConnectionStatus) {
            setConnectionStatus("connected");
          } else if (["pending", "created", "paused"].includes(taskData.status) && setConnectionStatus) {
            setConnectionStatus("connecting");
          }
          
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
                if (setConnectionStatus) setConnectionStatus("error");
                toast.error(apiResponse.error);
                
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                if (urlCheckIntervalRef.current) {
                  clearInterval(urlCheckIntervalRef.current);
                  urlCheckIntervalRef.current = null;
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
                if (setConnectionStatus) setConnectionStatus("connected");
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
                const latestRecording = apiResponse.recordings.reduce((latest: any, current: any) => {
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
              const statusMap: Record<string, TaskStatus> = {
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
              setTaskStatus(mappedStatus as TaskStatus);
              
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
                
                if (urlCheckIntervalRef.current) {
                  clearInterval(urlCheckIntervalRef.current);
                  urlCheckIntervalRef.current = null;
                }
                
                setIsProcessing(false);
                
                if (mappedStatus === "failed") {
                  toast.error("Task failed");
                  setError("Task failed");
                  if (setConnectionStatus) setConnectionStatus("error");
                } else if (mappedStatus === "completed") {
                  toast.success("Task completed successfully");
                  if (setConnectionStatus) setConnectionStatus("disconnected");
                } else if (mappedStatus === "stopped") {
                  toast.info("Task stopped");
                  if (setConnectionStatus) setConnectionStatus("disconnected");
                }
              }
            }
          } catch (apiCheckError) {
            console.error("Error checking API status:", apiCheckError);
            if (setConnectionStatus) setConnectionStatus("error");
          }
        }
      } catch (error) {
        console.error("Error in task monitoring:", error);
        if (setConnectionStatus) setConnectionStatus("error");
      }
    };
    
    // Immediately fetch task details
    fetchTaskDetails();
    
    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(fetchTaskDetails, 5000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (urlCheckIntervalRef.current) {
        clearInterval(urlCheckIntervalRef.current);
      }
    };
  }, [
    state.currentTaskId,
    state.taskStatus,
    currentTaskId,
    setCurrentUrl,
    setError,
    setIsProcessing,
    setLiveUrl,
    setProgress,
    setTaskStatus,
    setTaskSteps,
    setTaskOutput,
    setConnectionStatus
  ]);
}
