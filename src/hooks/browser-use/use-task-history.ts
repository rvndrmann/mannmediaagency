
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
      const { error } = await supabase
        .from('browser_task_history')
        .insert(taskData);
      
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
