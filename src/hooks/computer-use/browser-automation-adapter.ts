
import { supabase } from "@/integrations/supabase/client";

export interface BrowserAutomationConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface BrowserAutomationResult {
  taskId: string;
  status: string;
  output?: any;
  error?: string;
}

export class BrowserAutomationAdapter {
  async submitTask(task: string, config?: BrowserAutomationConfig): Promise<BrowserAutomationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          task,
          config: config || {},
        },
      });

      if (error) throw error;

      return {
        taskId: data.taskId,
        status: data.status || 'created',
        output: data.output,
      };
    } catch (error) {
      console.error('Browser automation task submission failed:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: string): Promise<BrowserAutomationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'status',
          taskId,
        },
      });

      if (error) throw error;

      return {
        taskId,
        status: data.status,
        output: data.output,
        error: data.error,
      };
    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }

  async stopTask(taskId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'stop',
          taskId,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to stop task:', error);
      throw error;
    }
  }
}
