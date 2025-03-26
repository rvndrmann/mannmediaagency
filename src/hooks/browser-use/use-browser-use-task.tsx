import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

// Define task status type for better type safety
type TaskStatus = 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed' | 'expired';

// Define the configuration options
interface BrowserConfig {
  saveSession: boolean;
  autoRetry: boolean;
  autoRefresh: boolean;
  maxRetries: number;
}

// Custom hook for browser automation tasks
export const useBrowserUseTask = () => {
  const [taskInput, setTaskInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [browserTaskId, setBrowserTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [taskOutput, setTaskOutput] = useState<any[]>([]);
  
  // Browser configuration with defaults
  const [browserConfig, setBrowserConfig] = useState<BrowserConfig>({
    saveSession: true,
    autoRetry: true,
    autoRefresh: true,
    maxRetries: 3
  });

  // Fetch user credits
  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ['userCredits'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Function to load a task by ID
  const loadTask = useCallback(async (taskId: string) => {
    try {
      console.info('Loading task with ID:', taskId);
      
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.info('Loaded task:', data);
      
      if (data) {
        setCurrentTaskId(data.id);
        setBrowserTaskId(data.browser_task_id || null);
        setTaskInput(data.input);
        setTaskStatus(data.status as TaskStatus);
        setProgress(data.progress || 0);
        setCurrentUrl(data.current_url || null);
        setLiveUrl(data.live_url || null);
        
        // If the task is completed, get the output
        if (data.output) {
          try {
            setTaskOutput(typeof data.output === 'string' ? JSON.parse(data.output) : data.output);
          } catch (e) {
            setTaskOutput([{ text: data.output }]);
          }
        }
        
        // Update connection status based on task status
        if (['running', 'paused'].includes(data.status)) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error loading task:', error);
      toast.error('Failed to load task details');
      return null;
    }
  }, []);

  // Function to load the previous task
  const loadPreviousTask = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const taskData = await loadTask(taskId);
      
      if (taskData) {
        // For completed tasks, let's also try to get recordings
        if (['completed', 'failed', 'stopped', 'expired'].includes(taskData.status)) {
          await getTaskMedia(taskData.browser_task_id);
        }
        
        toast.success('Task loaded successfully');
      }
    } catch (error) {
      console.error('Error loading previous task:', error);
      toast.error('Failed to load previous task');
    } finally {
      setIsProcessing(false);
    }
  }, [loadTask]);

  // Function to get task media (recordings)
  const getTaskMedia = async (taskId: string | null) => {
    if (!taskId) return;

    try {
      console.log('Getting media for task ID:', taskId);
      
      // First, check if we have the media locally in the browser
      const localMedia = localStorage.getItem(`workerAI_media_${taskId}`);
      
      if (localMedia) {
        try {
          const mediaData = JSON.parse(localMedia);
          processMediaData(mediaData);
          return;
        } catch (e) {
          console.error('Error parsing local media data:', e);
        }
      }
      
      // If not in local storage, fetch from API
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get task media');
      }
      
      const data = await response.json();
      processMediaData(data);
      
      // Save media data to local storage for future use
      if (data && data.recordings && data.recordings.length > 0) {
        localStorage.setItem(`workerAI_media_${taskId}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error getting task media:', error);
    }
  };

  // Process media data
  const processMediaData = (data: any) => {
    if (data && data.recordings && data.recordings.length > 0) {
      // Add recordings to task output for display
      setTaskOutput(prevOutput => {
        // Check if we already have recordings in the output
        const hasRecordings = prevOutput.some(item => item.type === 'recording');
        
        if (hasRecordings) {
          return prevOutput;
        }
        
        return [
          ...prevOutput,
          {
            type: 'recording',
            urls: data.recordings
          }
        ];
      });
      
      console.log('Task recordings:', data.recordings);
    }
  };

  // Function to fetch the task status
  const fetchTaskStatus = useCallback(async (browserTaskId: string) => {
    try {
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${browserTaskId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get task status');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching task status:', error);
      return null;
    }
  }, []);

  // Function to fetch full task details
  const fetchTaskDetails = useCallback(async (browserTaskId: string) => {
    try {
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${browserTaskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get task details');
      }
      
      const data = await response.json();
      
      // Update state with task details
      if (data) {
        setTaskStatus(data.status as TaskStatus);
        setProgress(calculateProgress(data));
        
        if (data.live_url && data.live_url !== liveUrl) {
          setLiveUrl(data.live_url);
          setConnectionStatus('connected');
        }
        
        // Update local DB with the latest data
        if (currentTaskId) {
          await supabase
            .from('browser_automation_tasks')
            .update({
              status: data.status,
              progress: calculateProgress(data),
              live_url: data.live_url,
              current_url: currentUrl,
              browser_data: data.browser_data || null,
              output: data.output,
              completed_at: data.status === 'finished' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTaskId);
        }
        
        // If task is completed/failed/stopped, get the recording
        if (['finished', 'failed', 'stopped'].includes(data.status)) {
          await getTaskMedia(browserTaskId);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching task details:', error);
      return null;
    }
  }, [currentTaskId, liveUrl, currentUrl]);

  // Calculate progress based on steps completed
  const calculateProgress = (taskData: any) => {
    if (!taskData || !taskData.steps || taskData.steps.length === 0) {
      return 0;
    }
    
    // Calculate progress based on steps
    const totalSteps = 15; // Typical number of steps
    const completedSteps = taskData.steps.length;
    return Math.min(Math.round((completedSteps / totalSteps) * 100), 100);
  };

  // Function to start a new task
  const startTask = async () => {
    if (!taskInput.trim()) {
      toast.error('Please enter a task description');
      return;
    }
    
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error('You need at least 1 credit to start a task');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setConnectionStatus('connecting');
    setTaskOutput([]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to use this feature');
      }
      
      // Create a record in our database first
      const { data: taskRecord, error: dbError } = await supabase
        .from('browser_automation_tasks')
        .insert({
          user_id: user.id,
          input: taskInput,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();
      
      if (dbError) {
        throw dbError;
      }
      
      setCurrentTaskId(taskRecord.id);
      
      // Start the task with the Browser API
      const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: taskInput,
          save_browser_data: browserConfig.saveSession
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start task');
      }
      
      const data = await response.json();
      console.log('Task started:', data);
      
      setBrowserTaskId(data.task_id);
      setTaskStatus('running');
      
      // Update our database record with the browser task ID
      await supabase
        .from('browser_automation_tasks')
        .update({
          browser_task_id: data.task_id,
          status: 'running'
        })
        .eq('id', taskRecord.id);
      
      // Start polling for task status
      pollTaskStatus(data.task_id);
      
      toast.success('Task started successfully');
      
      // Refetch user credits
      refetchCredits();
      
      // Save current task ID to localStorage for persistence
      localStorage.setItem('workerAI_currentTaskId', taskRecord.id);
      
      setTaskOutput(prev => [
        ...prev,
        {
          type: 'system',
          text: 'Task started. Worker AI is now processing your request.'
        }
      ]);
    } catch (error) {
      console.error('Error starting task:', error);
      setError(error instanceof Error ? error.message : 'Failed to start task');
      setTaskStatus('failed');
      setConnectionStatus('disconnected');
      
      setTaskOutput(prev => [
        ...prev,
        {
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to start task'
        }
      ]);
      
      toast.error(error instanceof Error ? error.message : 'Failed to start task');
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling function for task status
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const taskDetails = await fetchTaskDetails(taskId);
      
      if (taskDetails) {
        console.log('Task status:', taskDetails.status);
        
        // Check if the task is still running
        if (['created', 'running', 'paused'].includes(taskDetails.status)) {
          // Continue polling
          setTimeout(() => pollTaskStatus(taskId), 5000);
        } else {
          // Task is completed or failed
          console.log('Task completed with status:', taskDetails.status);
          
          if (taskDetails.status === 'finished') {
            setTaskStatus('completed');
            toast.success('Task completed successfully');
            
            setTaskOutput(prev => [
              ...prev,
              {
                type: 'system',
                text: 'Task completed successfully.'
              }
            ]);
            
            // Get the recordings even for completed tasks
            await getTaskMedia(taskId);
          } else {
            setTaskStatus(taskDetails.status === 'stopped' ? 'stopped' : 'failed');
            
            setTaskOutput(prev => [
              ...prev,
              {
                type: 'system',
                text: `Task ${taskDetails.status === 'stopped' ? 'stopped' : 'failed'}.`
              }
            ]);
            
            // Still get recordings even for failed tasks
            await getTaskMedia(taskId);
          }
          
          setConnectionStatus('disconnected');
        }
        
        // Update steps if available
        if (taskDetails.steps && taskDetails.steps.length > 0) {
          const lastStep = taskDetails.steps[taskDetails.steps.length - 1];
          
          if (lastStep.next_goal) {
            setTaskOutput(prev => {
              // Check if we already have this step
              const hasStep = prev.some(item => 
                item.type === 'step' && 
                item.stepNumber === lastStep.step && 
                item.goal === lastStep.next_goal
              );
              
              if (hasStep) {
                return prev;
              }
              
              return [
                ...prev,
                {
                  type: 'step',
                  stepNumber: lastStep.step,
                  goal: lastStep.next_goal,
                  evaluation: lastStep.evaluation_previous_goal
                }
              ];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error polling task status:', error);
    }
  }, [fetchTaskDetails]);

  // Function to pause a running task
  const pauseTask = async () => {
    if (!browserTaskId) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`https://api.browser-use.com/api/v1/pause-task?task_id=${browserTaskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause task');
      }
      
      setTaskStatus('paused');
      
      if (currentTaskId) {
        await supabase
          .from('browser_automation_tasks')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTaskId);
      }
      
      setTaskOutput(prev => [
        ...prev,
        {
          type: 'system',
          text: 'Task paused.'
        }
      ]);
      
      toast.info('Task paused');
    } catch (error) {
      console.error('Error pausing task:', error);
      toast.error('Failed to pause task');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to resume a paused task
  const resumeTask = async () => {
    if (!browserTaskId) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`https://api.browser-use.com/api/v1/resume-task?task_id=${browserTaskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume task');
      }
      
      setTaskStatus('running');
      setConnectionStatus('connected');
      
      if (currentTaskId) {
        await supabase
          .from('browser_automation_tasks')
          .update({
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTaskId);
      }
      
      // Start polling for task status again
      pollTaskStatus(browserTaskId);
      
      setTaskOutput(prev => [
        ...prev,
        {
          type: 'system',
          text: 'Task resumed.'
        }
      ]);
      
      toast.info('Task resumed');
    } catch (error) {
      console.error('Error resuming task:', error);
      toast.error('Failed to resume task');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to stop a running task
  const stopTask = async () => {
    if (!browserTaskId) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`https://api.browser-use.com/api/v1/stop-task?task_id=${browserTaskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop task');
      }
      
      setTaskStatus('stopped');
      setConnectionStatus('disconnected');
      
      if (currentTaskId) {
        await supabase
          .from('browser_automation_tasks')
          .update({
            status: 'stopped',
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .eq('id', currentTaskId);
      }
      
      setTaskOutput(prev => [
        ...prev,
        {
          type: 'system',
          text: 'Task stopped.'
        }
      ]);
      
      // Immediately try to get any recordings that might be available
      await getTaskMedia(browserTaskId);
      
      toast.info('Task stopped');
    } catch (error) {
      console.error('Error stopping task:', error);
      toast.error('Failed to stop task');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to restart a task
  const restartTask = async () => {
    // Clear current task state
    setCurrentTaskId(null);
    setBrowserTaskId(null);
    localStorage.removeItem('workerAI_currentTaskId');
    
    // Keep the task input but clear other state
    setTaskStatus('pending');
    setProgress(0);
    setLiveUrl(null);
    setConnectionStatus('disconnected');
    setTaskOutput([]);
    setError(null);
    
    // Start a new task
    await startTask();
  };

  // Function to clear the current session
  const clearSession = () => {
    setTaskInput('');
    setCurrentTaskId(null);
    setBrowserTaskId(null);
    setTaskStatus('pending');
    setProgress(0);
    setScreenshot(null);
    setCurrentUrl(null);
    setLiveUrl(null);
    setConnectionStatus('disconnected');
    setTaskOutput([]);
    setError(null);
    
    localStorage.removeItem('workerAI_currentTaskId');
    
    toast.info('Session cleared');
  };

  // Function to capture a screenshot
  const captureScreenshot = async () => {
    if (!liveUrl) {
      toast.error('No active browser session');
      return false;
    }
    
    try {
      // TODO: Implement screenshot capture
      toast.info('Screenshot functionality not available yet');
      return false;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error('Failed to capture screenshot');
      return false;
    }
  };

  // Load the last task ID from localStorage on component mount
  useEffect(() => {
    const savedTaskId = localStorage.getItem('workerAI_currentTaskId');
    if (savedTaskId) {
      loadPreviousTask(savedTaskId);
    }
  }, [loadPreviousTask]);

  // Helper function to format actions for display
  const formatAction = (action: any) => {
    if (!action) return 'Unknown action';
    
    return action.type;
  };

  return {
    taskInput,
    setTaskInput,
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    clearSession,
    loadPreviousTask,
    progress,
    taskStatus,
    currentUrl,
    setCurrentUrl,
    screenshot,
    captureScreenshot,
    userCredits,
    error,
    browserConfig,
    setBrowserConfig,
    liveUrl,
    connectionStatus,
    taskOutput,
    currentTaskId,
    browserTaskId,
    formatAction
  };
};
