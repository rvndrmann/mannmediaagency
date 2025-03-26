
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
      
      // Convert raw DB data to BrowserTaskHistory[] with correct types
      const typedHistory = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        task_input: item.task_input,
        output: item.output,
        status: item.status as TaskStatus, // Cast string to TaskStatus enum
        browser_task_id: item.browser_task_id,
        screenshot_url: item.screenshot_url,
        result_url: item.result_url,
        completed_at: item.completed_at,
        created_at: item.created_at,
        browser_data: item.browser_data as any // Cast Json to any for browser_data
      }));
      
      setTaskHistory(typedHistory);
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
        // Properly handle browser_data by converting to JSON string if needed
        browser_data: task.browser_data ? JSON.stringify(task.browser_data) : null
      };
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .insert(taskData)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Convert and add the new task to the history
      const newTask: BrowserTaskHistory = {
        id: data.id,
        user_id: data.user_id,
        task_input: data.task_input,
        output: data.output,
        status: data.status as TaskStatus,
        browser_task_id: data.browser_task_id,
        screenshot_url: data.screenshot_url,
        result_url: data.result_url,
        completed_at: data.completed_at,
        created_at: data.created_at,
        browser_data: typeof data.browser_data === 'string' 
          ? JSON.parse(data.browser_data) 
          : data.browser_data
      };
      
      setTaskHistory(prev => [newTask, ...prev]);
      return newTask;
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
        // Properly handle browser_data by converting to JSON string if needed
        browser_data: updates.browser_data ? JSON.stringify(updates.browser_data) : undefined
      };
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .update(updatedData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Update the task history state
      const updatedTask: BrowserTaskHistory = {
        id: data.id,
        user_id: data.user_id,
        task_input: data.task_input,
        output: data.output,
        status: data.status as TaskStatus,
        browser_task_id: data.browser_task_id,
        screenshot_url: data.screenshot_url,
        result_url: data.result_url,
        completed_at: data.completed_at,
        created_at: data.created_at,
        browser_data: typeof data.browser_data === 'string' 
          ? JSON.parse(data.browser_data) 
          : data.browser_data
      };
      
      setTaskHistory(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      
      return updatedTask;
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
        // Properly handle browser_data by converting to JSON string if needed
        browser_data: task.browser_data ? JSON.stringify(task.browser_data) : null
      }));
      
      // Use upsert with an array instead of single object
      const { data, error } = await supabase
        .from('browser_task_history')
        .upsert(tasksToSave);
      
      if (error) throw error;
      
      // Refresh task history after saving multiple tasks
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
      
      // Update the local state
      setTaskHistory(prev => prev.filter(task => task.id !== id));
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
