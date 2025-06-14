
import { useState, useCallback } from 'react';
import { BrowserTask, BrowserTaskState, TaskStatus, TaskStep, BrowserConfig } from './types';
import { useTaskOperations } from './use-task-operations';

const getDefaultBrowserConfig = (): BrowserConfig => {
  return {
    headless: false,
    disableSecurity: false,
    useOwnBrowser: false,
    chromePath: "",
    persistentSession: true,
    resolution: "1920x1080",
    theme: "Ocean",
    darkMode: false,
    sensitiveData: [],
    contextConfig: {
      minWaitPageLoadTime: 0.5,
      waitForNetworkIdlePageLoadTime: 5.0,
      maxWaitPageLoadTime: 15.0,
      highlightElements: true,
      viewportExpansion: 500
    }
  };
};

export const useBrowserUseTask = () => {
  const [state, setState] = useState<BrowserTaskState>({
    task: null,
    isLoading: false,
    error: null,
    taskInput: '',
    currentTaskId: '',
    isProcessing: false,
    taskStatus: 'idle',
    connectionStatus: 'disconnected',
    liveUrl: '',
    progress: 0,
    taskSteps: [],
    taskOutput: '',
    currentUrl: '',
    environment: 'browser',
    browserConfig: getDefaultBrowserConfig()
  });

  const { 
    createTask,
    pauseTask,
    resumeTask,
    stopTask,
    startTask,
    restartTask,
    isLoading: operationsLoading
  } = useTaskOperations();

  const submitTask = useCallback(async (taskInput: string, userId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const newTask = await createTask({
        input: taskInput,
        user_id: userId,
        environment: 'browser' as 'browser' | 'desktop',
        status: 'pending' as TaskStatus
      });

      setState(prev => ({
        ...prev,
        task: {
          ...newTask,
          status: newTask.status as TaskStatus,
          environment: (newTask.environment || 'browser') as 'browser' | 'desktop'
        },
        currentTaskId: newTask.id || '',
        taskStatus: newTask.status as TaskStatus,
        isLoading: false
      }));

      return newTask;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to create task',
        isLoading: false
      }));
      throw error;
    }
  }, [createTask]);

  const pauseCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await pauseTask();
      setState(prev => ({ ...prev, taskStatus: 'paused' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [pauseTask]);

  const resumeCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await resumeTask();
      setState(prev => ({ ...prev, taskStatus: 'running' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [resumeTask]);

  const stopCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await stopTask();
      setState(prev => ({ ...prev, taskStatus: 'stopped' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [stopTask]);

  const restartCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await restartTask();
      setState(prev => ({ ...prev, taskStatus: 'pending' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [restartTask]);

  return {
    ...state,
    submitTask,
    pauseTask: pauseCurrentTask,
    resumeTask: resumeCurrentTask,
    stopTask: stopCurrentTask,
    restartTask: restartCurrentTask,
    isLoading: state.isLoading || operationsLoading
  };
};
