
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserTaskHistory, BrowserTaskData, SupabaseBrowserTaskData, TaskStatus } from "./types";
import { toast } from "sonner";
import { safeStringify, safeParse } from "@/lib/safe-stringify";

export function useTaskHistory() {
  const [taskHistory, setTaskHistory] = useState<BrowserTaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert BrowserTaskData to a JSON-safe format for Supabase
  const taskDataToJson = (data: BrowserTaskData | null): any => {
    if (!data) return null;
    
    // Create a new object with transformed properties
    return {
      cookies: data.cookies,
      recordings: data.recordings,
      screenshots: data.screenshots,
      // Convert task steps to plain objects if needed
      steps: data.steps?.map(step => ({
        step: step.step,
        next_goal: step.next_goal,
        evaluation_previous_goal: step.evaluation_previous_goal,
        id: step.id,
        status: step.status,
        description: step.description,
        details: step.details
      }))
    };
  };

  // Convert from Supabase JSON format back to our typed format
  const jsonToTaskData = (json: any): BrowserTaskData | null => {
    if (!json) return null;
    
    return {
      cookies: json.cookies,
      recordings: json.recordings,
      screenshots: json.screenshots,
      steps: json.steps
    };
  };

  const fetchTaskHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("browser_tasks")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to our BrowserTaskHistory format
      const transformedData: BrowserTaskHistory[] = data.map(item => ({
        id: item.id,
        task_input: item.task_input,
        status: item.status as TaskStatus,
        user_id: item.user_id,
        browser_task_id: item.browser_task_id,
        output: item.output,
        screenshot_url: item.screenshot_url,
        result_url: item.result_url,
        browser_data: jsonToTaskData(item.browser_data),
        completed_at: item.completed_at,
        created_at: item.created_at
      }));

      setTaskHistory(transformedData);
    } catch (error) {
      console.error("Error fetching task history:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch task history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTaskToHistory = useCallback(async (task: Partial<BrowserTaskHistory>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error("User not authenticated");
      }

      // Process browser_data to ensure it's JSON-safe
      const processedTask = {
        ...task,
        user_id: user.user.id,
        browser_data: taskDataToJson(task.browser_data || null)
      };

      const { error } = await supabase
        .from("browser_tasks")
        .upsert([processedTask]);

      if (error) {
        throw error;
      }

      // Refresh task history after saving
      await fetchTaskHistory();
      return true;
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task to history");
      return false;
    }
  }, [fetchTaskHistory]);

  // Load task history on mount
  useEffect(() => {
    fetchTaskHistory();
  }, [fetchTaskHistory]);

  return {
    taskHistory,
    isLoading,
    error,
    fetchTaskHistory,
    saveTaskToHistory
  };
}
