
import { useState, useCallback } from 'react';
import { useTaskHistory } from './use-task-history';
import { BrowserTaskHistory, TaskStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for browser task operations (start, pause, resume, stop)
 */
export function useTaskOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { taskHistory, saveTask, updateTask } = useTaskHistory();
  
  /**
   * Start a new browser task
   */
  const startTask = useCallback(async (taskInput: string) => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, we would call an API to start a browser task
      console.log('Starting task:', taskInput);
      
      // Create a new task entry
      const newTask: Partial<BrowserTaskHistory> = {
        task_input: taskInput,
        status: 'running' as TaskStatus,
        browser_task_id: `task-${uuidv4().substring(0, 8)}`,
        created_at: new Date().toISOString()
      };
      
      // Save the task to history
      const savedTask = await saveTask(newTask);
      console.log('Task started:', savedTask);
      
      return savedTask;
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [saveTask]);
  
  /**
   * Pause a running task
   */
  const pauseTask = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, we would call an API to pause the task
      console.log('Pausing task:', taskId);
      
      // Update the task status
      const updatedTask = await updateTask(taskId, {
        status: 'paused' as TaskStatus
      });
      
      console.log('Task paused:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error pausing task:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask]);
  
  /**
   * Resume a paused task
   */
  const resumeTask = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, we would call an API to resume the task
      console.log('Resuming task:', taskId);
      
      // Update the task status
      const updatedTask = await updateTask(taskId, {
        status: 'running' as TaskStatus
      });
      
      console.log('Task resumed:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error resuming task:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask]);
  
  /**
   * Stop a running or paused task
   */
  const stopTask = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, we would call an API to stop the task
      console.log('Stopping task:', taskId);
      
      // Update the task status
      const updatedTask = await updateTask(taskId, {
        status: 'stopped' as TaskStatus,
        completed_at: new Date().toISOString()
      });
      
      console.log('Task stopped:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error('Error stopping task:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [updateTask]);
  
  return {
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask
  };
}
