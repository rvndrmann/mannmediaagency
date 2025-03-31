import { SupabaseClient } from "@supabase/supabase-js";

interface BrowserAgentServiceOptions {
  supabase: SupabaseClient;
  userId?: string;
  apiKey?: string;
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
      const { data, error: fetchError } = await this.supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching task:", fetchError);
        return { 
          success: false, 
          error: fetchError.message
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
