
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskHistory } from "./types";
import { toast } from "sonner";

export function useTaskHistory() {
  const [taskHistory, setTaskHistory] = useState<BrowserTaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const fetchTaskHistory = useCallback(async (force = false) => {
    // Don't refresh if we've done so in the last 10 seconds, unless forced
    const now = Date.now();
    if (!force && now - lastRefreshTime < 10000) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setTaskHistory(data || []);
      setLastRefreshTime(now);
    } catch (err) {
      console.error("Error fetching browser task history:", err);
      setError("Failed to fetch task history. Please try again.");
      toast.error("Failed to load task history");
    } finally {
      setIsLoading(false);
    }
  }, [lastRefreshTime]);
  
  useEffect(() => {
    fetchTaskHistory();
  }, [fetchTaskHistory]);
  
  const saveTaskToHistory = async (taskData: Partial<BrowserTaskHistory>) => {
    try {
      // Ensure required fields are present
      if (!taskData.task_input || !taskData.status || !taskData.user_id) {
        console.error("Missing required fields for task history");
        return;
      }
      
      const { data, error } = await supabase
        .from('browser_task_history')
        .insert({
          task_input: taskData.task_input,
          status: taskData.status,
          user_id: taskData.user_id,
          browser_task_id: taskData.browser_task_id || null,
          output: taskData.output || null,
          screenshot_url: taskData.screenshot_url || null,
          result_url: taskData.result_url || null,
          browser_data: taskData.browser_data || null,
          completed_at: taskData.completed_at || null
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      // Only force refresh when we've saved a new entry
      fetchTaskHistory(true);
      return data?.[0] as BrowserTaskHistory | undefined;
    } catch (err) {
      console.error("Error saving task to history:", err);
      toast.error("Failed to save task history");
      return undefined;
    }
  };
  
  const updateTaskHistory = async (id: string, updates: Partial<BrowserTaskHistory>) => {
    try {
      const { error } = await supabase
        .from('browser_task_history')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update the local state to avoid unnecessary refetching
      setTaskHistory(prevHistory => 
        prevHistory.map(task => 
          task.id === id ? { ...task, ...updates } : task
        )
      );
    } catch (err) {
      console.error("Error updating task history:", err);
      toast.error("Failed to update task history");
    }
  };

  const getTaskHistoryById = useCallback((id: string) => {
    return taskHistory.find(task => task.id === id);
  }, [taskHistory]);
  
  const getTaskHistoryByBrowserTaskId = useCallback((browserTaskId: string) => {
    return taskHistory.find(task => task.browser_task_id === browserTaskId);
  }, [taskHistory]);

  return {
    taskHistory,
    isLoading,
    error,
    fetchTaskHistory,
    saveTaskToHistory,
    updateTaskHistory,
    getTaskHistoryById,
    getTaskHistoryByBrowserTaskId
  };
}
