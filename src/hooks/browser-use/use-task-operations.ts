
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BrowserTask, TaskStatus } from './types';

export const useTaskOperations = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createTask = async (taskData: Partial<BrowserTask>) => {
    setIsLoading(true);
    try {
      // Ensure required fields are present
      if (!taskData.input || !taskData.user_id) {
        throw new Error('Missing required fields: input and user_id');
      }

      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .insert([{
          input: taskData.input,
          user_id: taskData.user_id,
          status: taskData.status || 'pending',
          environment: taskData.environment || 'browser',
          browser_data: taskData.browser_data || null,
          applications_config: taskData.applications_config || null,
          browser_task_id: taskData.browser_task_id || null,
          current_url: taskData.current_url || null,
          live_url: taskData.live_url || null,
          output: taskData.output || null,
          progress: taskData.progress || 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Task created successfully');
      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus, result?: any) => {
    setIsLoading(true);
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (result) {
        updateData.result = result;
      }

      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('browser_automation_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'paused');
  };

  const resumeTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'running');
  };

  const stopTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'stopped');
  };

  const startTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'running');
  };

  const restartTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'pending');
  };

  return {
    createTask,
    updateTaskStatus,
    deleteTask,
    pauseTask,
    resumeTask,
    stopTask,
    startTask,
    restartTask,
    isLoading
  };
};
