
import { useState, useEffect, useCallback } from 'react';
import { BrowserAgentService } from './BrowserAgentService';
import { BrowserAutomationTask, BrowserConfig } from '@/types/browser-automation';
import { useAuth } from '@/hooks/use-auth';
import { useInterval } from '@/hooks/use-interval';

interface BrowserAutomationState {
  taskId: string | null;
  taskInput: string;
  taskStatus: string;
  isProcessing: boolean;
  error: string | null;
  output: any | null;
  liveUrl: string | null;
  currentUrl: string | null;
  progress: number;
  browserConfig: BrowserConfig;
  taskHistory: BrowserAutomationTask[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export function useBrowserAutomation() {
  const { user } = useAuth();
  const browserAgentService = BrowserAgentService.getInstance();
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  
  const [state, setState] = useState<BrowserAutomationState>({
    taskId: null,
    taskInput: '',
    taskStatus: 'idle',
    isProcessing: false,
    error: null,
    output: null,
    liveUrl: null,
    currentUrl: null,
    progress: 0,
    browserConfig: {
      proxy: { enabled: false },
      headless: false,
      cookiesEnabled: true,
      javascriptEnabled: true,
      viewport: { width: 1280, height: 720 }
    },
    taskHistory: [],
    connectionStatus: 'disconnected'
  });
  
  const [environment, setEnvironment] = useState<'browser' | 'desktop'>('browser');
  
  const setTaskInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, taskInput: input }));
  }, []);
  
  const setBrowserConfig = useCallback((config: BrowserConfig) => {
    setState(prev => ({ ...prev, browserConfig: config }));
  }, []);
  
  const setCurrentUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, currentUrl: url }));
  }, []);
  
  // Load user credits
  useEffect(() => {
    if (user) {
      const loadCredits = async () => {
        try {
          // This would typically be a call to your API to get credits
          setUserCredits({ credits_remaining: 100 }); // Mock data
        } catch (error) {
          console.error('Error loading user credits:', error);
        }
      };
      
      loadCredits();
    }
  }, [user]);
  
  // Load task history
  useEffect(() => {
    if (user?.id) {
      const loadTaskHistory = async () => {
        const history = await browserAgentService.getTaskHistory(user.id);
        setState(prev => ({ ...prev, taskHistory: history }));
      };
      
      loadTaskHistory();
    }
  }, [user]);
  
  // Start a browser task
  const startTask = useCallback(async () => {
    if (!user?.id || !state.taskInput.trim()) {
      setState(prev => ({ 
        ...prev, 
        error: 'User ID or task input is missing' 
      }));
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      taskStatus: 'starting',
      connectionStatus: 'connecting',
      error: null 
    }));
    
    try {
      const result = await browserAgentService.startBrowserTask(
        state.taskInput,
        user.id,
        {
          environment,
          applicationConfig: state.browserConfig,
          saveSessionData: true
        }
      );
      
      if (!result) {
        throw new Error('Failed to start browser task');
      }
      
      setState(prev => ({ 
        ...prev, 
        taskId: result.taskId,
        liveUrl: result.liveUrl || null,
        taskStatus: 'running',
        connectionStatus: 'connected',
        progress: 5
      }));
      
      // Immediately check status to get initial state
      await checkTaskStatus(result.taskId);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        taskStatus: 'failed',
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error starting task'
      }));
    }
  }, [user, state.taskInput, state.browserConfig, environment]);
  
  // Stop a browser task
  const stopTask = useCallback(async () => {
    if (!state.taskId) return;
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true
    }));
    
    try {
      const result = await browserAgentService.stopTask(state.taskId);
      
      if (!result) {
        throw new Error('Failed to stop browser task');
      }
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        taskStatus: 'stopped',
        connectionStatus: 'disconnected',
        progress: 100
      }));
      
      // Refresh task history
      if (user?.id) {
        const history = await browserAgentService.getTaskHistory(user.id);
        setState(prev => ({ ...prev, taskHistory: history }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error stopping task'
      }));
    }
  }, [state.taskId, user]);
  
  // Pause task (stub for now)
  const pauseTask = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      taskStatus: 'paused',
      connectionStatus: 'connected'
    }));
  }, []);
  
  // Resume task (stub for now)
  const resumeTask = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      taskStatus: 'running',
      connectionStatus: 'connected'
    }));
  }, []);
  
  // Restart task
  const restartTask = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      taskId: null,
      taskStatus: 'idle',
      isProcessing: false,
      error: null,
      output: null,
      liveUrl: null,
      progress: 0,
      connectionStatus: 'disconnected'
    }));
    
    setTimeout(() => {
      startTask();
    }, 100);
  }, [startTask]);
  
  // Check task status
  const checkTaskStatus = useCallback(async (taskId: string) => {
    try {
      const result = await browserAgentService.checkTaskStatus(taskId);
      
      let progress = state.progress;
      if (result.status === 'completed') {
        progress = 100;
      } else if (result.status === 'running') {
        // Increment progress for visual feedback
        progress = Math.min(progress + 5, 90);
      }
      
      setState(prev => ({ 
        ...prev, 
        taskStatus: result.status,
        isProcessing: result.status === 'running',
        error: result.error || null,
        output: result.output || null,
        progress,
        connectionStatus: result.status === 'running' ? 'connected' : 
                        result.status === 'completed' ? 'disconnected' :
                        result.status === 'failed' ? 'error' : 'disconnected'
      }));
      
      // If task is completed or failed, refresh task history
      if ((result.status === 'completed' || result.status === 'failed') && user?.id) {
        const history = await browserAgentService.getTaskHistory(user.id);
        setState(prev => ({ ...prev, taskHistory: history }));
      }
      
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error checking task status'
      }));
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [state.progress, user]);
  
  // Poll for task status updates
  useInterval(
    () => {
      if (state.taskId && state.taskStatus === 'running') {
        checkTaskStatus(state.taskId);
      }
    },
    state.taskId && state.taskStatus === 'running' ? 5000 : null
  );
  
  // Take a screenshot (stub for now)
  const captureScreenshot = useCallback(async () => {
    // This would call an API to capture a screenshot
    return null;
  }, []);
  
  return {
    taskInput: state.taskInput,
    setTaskInput,
    isProcessing: state.isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    progress: state.progress,
    taskStatus: state.taskStatus,
    currentUrl: state.currentUrl,
    setCurrentUrl,
    screenshot: null,
    captureScreenshot,
    userCredits,
    error: state.error,
    browserConfig: state.browserConfig,
    setBrowserConfig,
    liveUrl: state.liveUrl,
    connectionStatus: state.connectionStatus,
    taskOutput: state.output,
    environment,
    setEnvironment,
    taskHistory: state.taskHistory
  };
}
