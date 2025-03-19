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
    setError 
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
        allowed_domains: formattedConfig.contextConfig.allowedDomains,
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

      const taskId = taskData.id;
      console.log("Created task with ID:", taskId);
      setCurrentTaskId(taskId);

      const formattedConfig = formatConfigForApi(browserConfig);
      console.log("Sending browser config:", formattedConfig);

      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: taskInput,
          task_id: taskId,
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
          .eq('id', taskId);
        
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
          .eq('id', taskId);
        
        setError(`Task Error: ${apiResponse.error}`);
        setTaskStatus('failed');
        setIsProcessing(false);
        return;
      }

      if (apiResponse.task_id) {
        await supabase
          .from('browser_automation_tasks')
          .update({ browser_task_id: apiResponse.task_id })
          .eq('id', taskId);
      }

      if (apiResponse.live_url) {
        await supabase
          .from('browser_automation_tasks')
          .update({ live_url: apiResponse.live_url })
          .eq('id', taskId);
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
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
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
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
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
      const { data, error } = await supabase.functions.invoke('browser-use-api', {
        body: {
          task_id: currentTaskId,
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

  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask
  };
}
