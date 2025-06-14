
import { supabase } from "@/integrations/supabase/client";
import { BrowserTask } from "./browser-use/types";

export const useTaskOperations = () => {
  const createTask = async (taskData: Omit<BrowserTask, 'id' | 'created_at' | 'updated_at'>): Promise<BrowserTask> => {
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
    return data;
  };

  const pauseTask = async (taskId?: string): Promise<BrowserTask> => {
    if (!taskId) throw new Error("Task ID is required");
    
    const { data, error } = await supabase
      .from('browser_automation_tasks')
      .update({ status: 'paused' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const resumeTask = async (taskId?: string): Promise<BrowserTask> => {
    if (!taskId) throw new Error("Task ID is required");
    
    const { data, error } = await supabase
      .from('browser_automation_tasks')
      .update({ status: 'running' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const stopTask = async (taskId?: string): Promise<BrowserTask> => {
    if (!taskId) throw new Error("Task ID is required");
    
    const { data, error } = await supabase
      .from('browser_automation_tasks')
      .update({ status: 'stopped' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const restartTask = async (taskId?: string): Promise<BrowserTask> => {
    if (!taskId) throw new Error("Task ID is required");
    
    const { data, error } = await supabase
      .from('browser_automation_tasks')
      .update({ status: 'pending' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const startTask = async (taskId?: string): Promise<BrowserTask> => {
    if (!taskId) throw new Error("Task ID is required");
    
    const { data, error } = await supabase
      .from('browser_automation_tasks')
      .update({ status: 'running' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    createTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    startTask,
    isLoading: false
  };
};
