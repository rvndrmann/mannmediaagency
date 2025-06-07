
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BrowserTask, TaskStatus } from './types';

export const useTaskOperations = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createTask = async (taskData: Partial<BrowserTask>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .insert([taskData])
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

  return {
    createTask,
    updateTaskStatus,
    deleteTask,
    pauseTask,
    resumeTask,
    stopTask,
    isLoading
  };
};
