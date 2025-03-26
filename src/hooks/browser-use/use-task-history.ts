
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { BrowserTaskHistory, BrowserTaskData, TaskStatus } from './types';
import { Json } from '@/integrations/supabase/types';

export function useTaskHistory() {
  const [taskHistory, setTaskHistory] = useState<BrowserTaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTaskHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('browser_task_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTaskHistory(data || []);
    } catch (err) {
      console.error('Error fetching task history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task history');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTask = async (task: Partial<BrowserTaskHistory>) => {
    if (!user) return null;
    
    try {
      // Make sure required fields are present
      const taskData = {
        ...task,
        user_id: user.id,
        status: task.status || 'pending' as TaskStatus,
        task_input: task.task_input || '',
        // Convert browser_data to JSON to satisfy the typing
        browser_data: task.browser_data ? JSON.parse(JSON.stringify(task.browser_data)) : null
      };
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .insert(taskData)
        .select('*')
        .single();
      
      if (error) throw error;
      
      await fetchTaskHistory();
      return data;
    } catch (err) {
      console.error('Error saving task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<BrowserTaskHistory>) => {
    if (!user) return null;
    
    try {
      // Ensure browser_data is properly stringified if it exists
      const updatedData = {
        ...updates,
        // Convert browser_data to JSON to satisfy the typing
        browser_data: updates.browser_data ? JSON.parse(JSON.stringify(updates.browser_data)) : undefined
      };
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .update(updatedData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      await fetchTaskHistory();
      return data;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const saveMultipleTasks = async (tasks: Partial<BrowserTaskHistory>[]) => {
    if (!user || !tasks.length) return [];
    
    try {
      // Ensure all tasks have the user_id and required fields
      const tasksToSave = tasks.map(task => ({
        ...task,
        user_id: user.id,
        status: task.status || 'pending' as TaskStatus, 
        task_input: task.task_input || '',
        // Convert browser_data to JSON to satisfy the typing
        browser_data: task.browser_data ? JSON.parse(JSON.stringify(task.browser_data)) : null
      }));
      
      // Use upsert instead of insert for multiple records
      const { data, error } = await supabase
        .from('browser_task_history')
        .upsert(tasksToSave)
        .select('*');
      
      if (error) throw error;
      
      await fetchTaskHistory();
      return data || [];
    } catch (err) {
      console.error('Error saving multiple tasks:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('browser_task_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      await fetchTaskHistory();
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  // Load task history when user changes
  useEffect(() => {
    if (user) {
      fetchTaskHistory();
    }
  }, [user]);

  return {
    taskHistory,
    isLoading,
    error,
    fetchTaskHistory,
    saveTask,
    updateTask,
    saveMultipleTasks,
    deleteTask
  };
}
