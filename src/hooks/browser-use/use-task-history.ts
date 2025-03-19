
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskHistory } from "./types";
import { toast } from "sonner";

export function useTaskHistory() {
  const [taskHistory, setTaskHistory] = useState<BrowserTaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskHistory = async () => {
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
    } catch (err) {
      console.error("Error fetching browser task history:", err);
      setError("Failed to fetch task history. Please try again.");
      toast.error("Failed to load task history");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTaskHistory();
  }, []);
  
  const saveTaskToHistory = async (taskData: Partial<BrowserTaskHistory>) => {
    try {
      // Ensure required fields are present
      if (!taskData.task_input || !taskData.status || !taskData.user_id) {
        console.error("Missing required fields for task history");
        return;
      }
      
      const { error } = await supabase
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
        });
      
      if (error) {
        throw error;
      }
      
      fetchTaskHistory();
    } catch (err) {
      console.error("Error saving task to history:", err);
      toast.error("Failed to save task history");
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
      
      fetchTaskHistory();
    } catch (err) {
      console.error("Error updating task history:", err);
      toast.error("Failed to update task history");
    }
  };

  return {
    taskHistory,
    isLoading,
    error,
    fetchTaskHistory,
    saveTaskToHistory,
    updateTaskHistory
  };
}
