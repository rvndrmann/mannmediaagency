import { supabase } from "@/integrations/supabase/client";
import { BrowserConfig, TaskStatus } from "./types";

interface TaskState {
  taskInput: string;
  currentTaskId: string | null;
  isProcessing: boolean;
  taskStatus: TaskStatus;
  browserConfig: BrowserConfig;
}

interface StateSetters {
  setCurrentTaskId: (id: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setTaskStatus: (status: TaskStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setLiveUrl: (url: string | null) => void;
}

export function useTaskOperations(
  state: TaskState,
  stateSetters: StateSetters
) {
  const { 
    taskInput, 
    currentTaskId, 
    isProcessing, 
    taskStatus, 
    browserConfig 
  } = state;

  const { 
    setCurrentTaskId, 
    setIsProcessing, 
    setTaskStatus, 
    setProgress, 
    setError,
    setLiveUrl
  } = stateSetters;

  const formatConfigForApi = (config: BrowserConfig) => {
    const formattedConfig = JSON.parse(JSON.stringify(config));
    
    if (formattedConfig.resolution && !formattedConfig.contextConfig?.browserWindowSize) {
      const parts = formattedConfig.resolution.split('x');
      if (parts.length === 2) {
        const width = parseInt(parts[0].trim());
        const height = parseInt(parts[1].trim());
        
        if (!isNaN(width) && !isNaN(height)) {
          if (!formattedConfig.contextConfig) {
            formattedConfig.contextConfig = {};
          }
          
          formattedConfig.contextConfig.browserWindowSize = { 
            width, 
            height 
          };
        }
      }
    }
    
    return {
      headless: formattedConfig.headless,
      disable_security: formattedConfig.disableSecurity,
      wss_url: formattedConfig.wssUrl,
      cdp_url: formattedConfig.cdpUrl,
      chrome_instance_path: formattedConfig.useOwnBrowser ? formattedConfig.chromePath : undefined,
      extra_chromium_args: formattedConfig.extraChromiumArgs,
      proxy: formattedConfig.proxy,
      context_config: formattedConfig.contextConfig ? {
        minimum_wait_page_load_time: formattedConfig.contextConfig.minWaitPageLoadTime,
        wait_for_network_idle_page_load_time: formattedConfig.contextConfig.waitForNetworkIdlePageLoadTime,
        maximum_wait_page_load_time: formattedConfig.contextConfig.maxWaitPageLoadTime,
        browser_window_size: formattedConfig.contextConfig.browserWindowSize,
        locale: formattedConfig.contextConfig.locale,
        user_agent: formattedConfig.contextConfig.userAgent,
        highlight_elements: formattedConfig.contextConfig.highlightElements,
        viewport_expansion: formattedConfig.contextConfig.viewportExpansion,
        allowed_domains: formattedConfig.contextConfig.allowedDomains ? 
          (Array.isArray(formattedConfig.contextConfig.allowedDomains) ? 
            formattedConfig.contextConfig.allowedDomains : 
            [formattedConfig.contextConfig.allowedDomains]) : 
          undefined,
        save_recording_path: formattedConfig.contextConfig.saveRecordingPath,
        trace_path: formattedConfig.contextConfig.tracePath,
        cookies_file: formattedConfig.contextConfig.cookiesFile
      } : undefined,
      theme: formattedConfig.theme,
      dark_mode: formattedConfig.darkMode,
      persistent_session: formattedConfig.persistentSession
    };
  };

  const startTask = async () => {
    if (isProcessing) return;
    if (!taskInput.trim()) {
      setError("Please enter a task description");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setLiveUrl(null);
      
      // First, create a local database entry for our task
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .insert({
          input: taskInput,
          status: 'pending',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (taskError) {
        console.error("Error creating task:", taskError);
        setError(`Failed to create task: ${taskError.message}`);
        setIsProcessing(false);
        return;
      }

      // This is our local database task ID
      const localTaskId = taskData.id;
      console.log("Created task with local ID:", localTaskId);
      setCurrentTaskId(localTaskId);

      // Format the browser config for the API
      const formattedConfig = formatConfigForApi(browserConfig);
      console.log("Sending browser config:", formattedConfig);

      // Call the edge function to create a task in the Browser Use API
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: taskInput,
          save_browser_data: true,
          browser_config: formattedConfig
        }
      });

      if (apiError) {
        console.error("Edge function error:", apiError);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiError.message }) 
          })
          .eq('id', localTaskId);
        
        setError(`API Error: ${apiError.message}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      console.log("Browser Use API response:", apiResponse);
      
      if (apiResponse.error) {
        console.error("Browser Use API returned error:", apiResponse.error);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiResponse.error }) 
          })
          .eq('id', localTaskId);
        
        setError(`Task Error: ${apiResponse.error}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      // CRUCIAL: Store the API task ID from the response
      // This is the ID from the Browser Use API that we need for all future API calls
      if (apiResponse.task_id) {
        console.log(`Updating task ${localTaskId} with browser_task_id: ${apiResponse.task_id}`);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            browser_task_id: apiResponse.task_id,
            // Store the current task status if provided
            status: apiResponse.status || 'running'
          })
          .eq('id', localTaskId);
        
        // We don't update the currentTaskId here because we want to keep using
        // our local database ID for database operations, but when we make API calls
        // the task monitoring system will use the stored browser_task_id from the database
      } else {
        console.warn("No task_id returned from API. This may cause issues with task monitoring.");
      }

      // If we immediately get a live_url, update it
      if (apiResponse.live_url) {
        console.log(`Setting initial live URL: ${apiResponse.live_url}`);
        setLiveUrl(apiResponse.live_url);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ live_url: apiResponse.live_url })
          .eq('id', localTaskId);
      }

      // Immediately check for task status to get live URL sooner
      try {
        // IMPORTANT: Use the Browser Use API task ID for status checks, not our database ID
        const apiTaskId = apiResponse.task_id || localTaskId;
        
        const { data: initialStatus } = await supabase.functions.invoke('browser-use-api', {
          body: { task_id: apiTaskId }
        });
        
        if (initialStatus && initialStatus.browser && initialStatus.browser.live_url) {
          console.log(`Found live URL in initial status check: ${initialStatus.browser.live_url}`);
          setLiveUrl(initialStatus.browser.live_url);
          
          await supabase
            .from('browser_automation_tasks')
            .update({ live_url: initialStatus.browser.live_url })
            .eq('id', localTaskId);
        }
      } catch (statusError) {
        console.warn("Non-critical error checking initial status:", statusError);
      }

      setTaskStatus('running');
    } catch (error) {
      console.error("Error starting task:", error);
      setError(`Unexpected error: ${error.message}`);
      setIsProcessing(false);
      setTaskStatus('failed');
    }
  };

  const pauseTask = async () => {
    if (!currentTaskId || taskStatus !== 'running') return;

    try {
      // Get the browser_task_id from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', currentTaskId)
        .single();
        
      if (taskError || !taskData?.browser_task_id) {
        const errorMsg = taskError?.message || "Browser task ID not found";
        console.error("Error retrieving browser task ID:", errorMsg);
        setError(`Failed to pause task: ${errorMsg}`);
        return;
      }
      
      // Use the Browser Use API task ID for the API call
      const browserTaskId = taskData.browser_task_id;
      console.log(`Using browser task ID for pause: ${browserTaskId}`);

      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: browserTaskId,
          action: 'pause'
        }
      });

      if (error) {
        console.error("Error pausing task:", error);
        setError(`Failed to pause task: ${error.message}`);
        return;
      }

      console.log("Pause task response:", data);
      
      setTaskStatus('paused');
      
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'paused' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in pauseTask:", error);
      setError(`Pause error: ${error.message}`);
    }
  };

  const resumeTask = async () => {
    if (!currentTaskId || taskStatus !== 'paused') return;

    try {
      // Get the browser_task_id from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', currentTaskId)
        .single();
        
      if (taskError || !taskData?.browser_task_id) {
        const errorMsg = taskError?.message || "Browser task ID not found";
        console.error("Error retrieving browser task ID:", errorMsg);
        setError(`Failed to resume task: ${errorMsg}`);
        return;
      }
      
      // Use the Browser Use API task ID for the API call
      const browserTaskId = taskData.browser_task_id;
      console.log(`Using browser task ID for resume: ${browserTaskId}`);

      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: browserTaskId,
          action: 'resume'
        }
      });

      if (error) {
        console.error("Error resuming task:", error);
        setError(`Failed to resume task: ${error.message}`);
        return;
      }

      console.log("Resume task response:", data);
      
      setTaskStatus('running');
      
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'running' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in resumeTask:", error);
      setError(`Resume error: ${error.message}`);
    }
  };

  const stopTask = async () => {
    if (!currentTaskId || (taskStatus !== 'running' && taskStatus !== 'paused')) return;

    try {
      // Get the browser_task_id from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', currentTaskId)
        .single();
        
      if (taskError || !taskData?.browser_task_id) {
        const errorMsg = taskError?.message || "Browser task ID not found";
        console.error("Error retrieving browser task ID:", errorMsg);
        setError(`Failed to stop task: ${errorMsg}`);
        return;
      }
      
      // Use the Browser Use API task ID for the API call
      const browserTaskId = taskData.browser_task_id;
      console.log(`Using browser task ID for stop: ${browserTaskId}`);

      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: browserTaskId,
          action: 'stop'
        }
      });

      if (error) {
        console.error("Error stopping task:", error);
        setError(`Failed to stop task: ${error.message}`);
        return;
      }

      console.log("Stop task response:", data);
      
      setTaskStatus('stopped');
      setIsProcessing(false);
      
      await supabase
        .from('browser_automation_tasks')
        .update({ status: 'stopped' })
        .eq('id', currentTaskId);
    } catch (error) {
      console.error("Error in stopTask:", error);
      setError(`Stop error: ${error.message}`);
    }
  };
  
  const restartTask = async () => {
    if (!currentTaskId || !taskInput.trim()) return;
    
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setLiveUrl(null);
      
      // Update the task status to pending
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: 'pending',
          browser_task_id: null, // Reset the Browser Use API task ID
          live_url: null,
          output: null,
          progress: 0,
          completed_at: null
        })
        .eq('id', currentTaskId);
      
      setTaskStatus('pending');

      const formattedConfig = formatConfigForApi(browserConfig);
      console.log("Sending browser config for restart:", formattedConfig);

      // Create a new task in the Browser Use API
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: taskInput,
          task_id: currentTaskId, // Include our local task ID for reference
          save_browser_data: true,
          browser_config: formattedConfig
        }
      });

      if (apiError) {
        console.error("Edge function error during restart:", apiError);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiError.message }) 
          })
          .eq('id', currentTaskId);
        
        setError(`API Error: ${apiError.message}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      console.log("Browser Use API restart response:", apiResponse);
      
      if (apiResponse.error) {
        console.error("Browser Use API returned error during restart:", apiResponse.error);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed', 
            output: JSON.stringify({ error: apiResponse.error }) 
          })
          .eq('id', currentTaskId);
        
        setError(`Task Error: ${apiResponse.error}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      // Store the API task ID in the database - this is crucial!
      if (apiResponse.task_id) {
        console.log(`Updating task ${currentTaskId} with new browser_task_id: ${apiResponse.task_id}`);
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            browser_task_id: apiResponse.task_id,
            status: apiResponse.status || 'running'
          })
          .eq('id', currentTaskId);
      } else {
        console.warn("No task_id returned from API during restart. This may cause issues with task monitoring.");
      }

      // If we immediately get a live_url, update it
      if (apiResponse.live_url) {
        console.log(`Setting initial live URL for restart: ${apiResponse.live_url}`);
        setLiveUrl(apiResponse.live_url);
        
        await supabase
          .from('browser_automation_tasks')
          .update({ live_url: apiResponse.live_url })
          .eq('id', currentTaskId);
      }

      setTaskStatus('running');
    } catch (error) {
      console.error("Error restarting task:", error);
      setError(`Unexpected error during restart: ${error.message}`);
      setIsProcessing(false);
      setTaskStatus('failed');
    }
  };

  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask
  };
}
