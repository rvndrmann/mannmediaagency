
import { useState, useCallback } from 'react';
import { BrowserTask, BrowserTaskState, TaskStatus, TaskStep } from './types';
import { useTaskOperations } from './use-task-operations';

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
    browserConfig: undefined
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
        environment: 'browser',
        status: 'pending'
      });

      setState(prev => ({
        ...prev,
        task: {
          ...newTask,
          status: newTask.status as TaskStatus
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
      await pauseTask(state.currentTaskId);
      setState(prev => ({ ...prev, taskStatus: 'paused' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [state.currentTaskId, pauseTask]);

  const resumeCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await resumeTask(state.currentTaskId);
      setState(prev => ({ ...prev, taskStatus: 'running' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [state.currentTaskId, resumeTask]);

  const stopCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await stopTask(state.currentTaskId);
      setState(prev => ({ ...prev, taskStatus: 'stopped' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [state.currentTaskId, stopTask]);

  const restartCurrentTask = useCallback(async () => {
    if (!state.currentTaskId) return;
    
    try {
      await restartTask(state.currentTaskId);
      setState(prev => ({ ...prev, taskStatus: 'pending' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [state.currentTaskId, restartTask]);

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
