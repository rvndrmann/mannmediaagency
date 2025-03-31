
import { SupabaseClient } from "@supabase/supabase-js";

interface BrowserAgentServiceOptions {
  supabase: SupabaseClient;
  userId?: string;
  apiKey?: string;
}

export interface BrowserTaskOptions {
  environment?: string;
  applicationConfig?: any;
  saveSessionData?: boolean;
}

export class BrowserAgentService {
  private supabase: SupabaseClient;
  private userId?: string;
  private apiKey: string;
  private static instance: BrowserAgentService;

  async createTask(url: string, instructions: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .insert([
          { 
            url, 
            instructions, 
            user_id: this.userId,
            status: 'pending'
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating task:", error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return { 
        success: true, 
        taskId: data.id 
      };
    } catch (err) {
      console.error("Exception in createTask:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  }

  async updateTaskStatus(taskId: string, status: string, result?: any): Promise<any> {
    try {
      const updateData: any = { status };
      if (result) {
        updateData.result = result;
      }

      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating task status:", error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return { 
        success: true, 
        task: data 
      };
    } catch (err) {
      console.error("Exception in updateTaskStatus:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  }

  async getBrowserTask(taskId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) {
        console.error("Error fetching task:", error);
        return { 
          success: false, 
          error: error.message
        };
      }
      
      return { 
        success: true, 
        task: data 
      };
    } catch (err) {
      console.error("Exception in getBrowserTask:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  }

  // New methods to fix TypeScript errors

  async startBrowserTask(
    taskInput: string, 
    userId: string, 
    options: BrowserTaskOptions = {}
  ): Promise<any> {
    try {
      // Default options
      const taskOptions = {
        environment: options.environment || 'browser',
        applicationConfig: options.applicationConfig || {},
        saveSessionData: options.saveSessionData !== undefined ? options.saveSessionData : true
      };

      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .insert({
          input: taskInput,
          user_id: userId,
          status: 'pending',
          environment: taskOptions.environment,
          applications_config: taskOptions.applicationConfig,
        })
        .select()
        .single();

      if (error) {
        console.error("Error starting browser task:", error);
        return null;
      }

      console.log("Started browser task:", data.id);
      return {
        taskId: data.id,
        liveUrl: data.live_url
      };
    } catch (err) {
      console.error("Exception in startBrowserTask:", err);
      return null;
    }
  }

  async checkTaskStatus(taskId: string): Promise<any> {
    try {
      const { data: task, error } = await this.supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error("Error checking task status:", error);
        return { status: 'error', error: error.message };
      }

      return {
        taskId: task.id,
        status: task.status,
        output: task.output,
        progress: task.progress,
        error: task.error || null,
        current_url: task.current_url
      };
    } catch (err) {
      console.error("Exception in checkTaskStatus:", err);
      return { status: 'error', error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  async stopTask(taskId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .update({ status: 'stopped' })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error("Error stopping task:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception in stopTask:", err);
      return null;
    }
  }

  async pauseTask(taskId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .update({ status: 'paused' })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error("Error pausing task:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception in pauseTask:", err);
      return null;
    }
  }

  async resumeTask(taskId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .update({ status: 'running' })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error("Error resuming task:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception in resumeTask:", err);
      return null;
    }
  }

  async getTask(taskId: string): Promise<any> {
    return this.getBrowserTask(taskId);
  }

  async getTaskHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching task history:", error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Exception in getTaskHistory:", err);
      return [];
    }
  }

  private constructor(options: BrowserAgentServiceOptions) {
    this.supabase = options.supabase;
    this.userId = options.userId;
    this.apiKey = options.apiKey || "";
  }

  public static getInstance(options?: BrowserAgentServiceOptions): BrowserAgentService {
    if (!BrowserAgentService.instance && options) {
      BrowserAgentService.instance = new BrowserAgentService(options);
    }
    return BrowserAgentService.instance as BrowserAgentService;
  }
}
