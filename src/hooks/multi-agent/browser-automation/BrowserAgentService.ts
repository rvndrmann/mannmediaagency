
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { BrowserAutomationTask } from "@/types/browser-automation";

export class BrowserAgentService {
  private static instance: BrowserAgentService;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): BrowserAgentService {
    if (!BrowserAgentService.instance) {
      BrowserAgentService.instance = new BrowserAgentService();
    }
    return BrowserAgentService.instance;
  }
  
  public async startBrowserTask(
    taskInput: string,
    userId: string,
    options: {
      environment?: string;
      applicationConfig?: any;
      saveSessionData?: boolean;
    } = {}
  ): Promise<{ taskId: string; liveUrl?: string } | null> {
    try {
      const taskId = uuidv4();
      const { environment = 'browser', applicationConfig, saveSessionData = true } = options;
      
      // Create task record in the database
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .insert({
          id: taskId,
          input: taskInput,
          user_id: userId,
          status: 'pending',
          environment,
          applications_config: applicationConfig || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating browser task:', error);
        return null;
      }
      
      // Call the browser-use API
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          operation: 'run-task',
          task: taskInput,
          save_browser_data: saveSessionData,
          userId,
          taskId
        }
      });
      
      if (apiError) {
        console.error('Error starting browser task:', apiError);
        
        // Update task status to failed
        await supabase
          .from('browser_automation_tasks')
          .update({
            status: 'failed',
            error_message: apiError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
          
        return null;
      }
      
      // Update task with browser task ID and live URL
      await supabase
        .from('browser_automation_tasks')
        .update({
          browser_task_id: apiResponse.taskId,
          status: 'running',
          live_url: apiResponse.liveUrl
        })
        .eq('id', taskId);
      
      return {
        taskId,
        liveUrl: apiResponse.liveUrl
      };
    } catch (error) {
      console.error('Error in startBrowserTask:', error);
      return null;
    }
  }
  
  public async checkTaskStatus(taskId: string): Promise<{ status: string; output?: any; error?: string }> {
    try {
      // First get the task from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        console.error('Error fetching task:', taskError);
        return { status: 'error', error: taskError.message };
      }
      
      // If the task is already completed or failed, return the stored status
      if (taskData.status === 'completed' || taskData.status === 'failed') {
        return {
          status: taskData.status,
          output: taskData.output,
          error: taskData.error_message
        };
      }
      
      // If the task is still running, check the API for updates
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          operation: 'get-task',
          taskId: taskData.browser_task_id
        }
      });
      
      if (apiError) {
        console.error('Error checking task status:', apiError);
        return { status: 'error', error: apiError.message };
      }
      
      // Map API status to our status
      let status = taskData.status;
      if (apiResponse.status === 'finished') {
        status = 'completed';
      } else if (apiResponse.status === 'failed') {
        status = 'failed';
      }
      
      // Update our database with the latest status
      if (status !== taskData.status) {
        const updateData: Partial<BrowserAutomationTask> = {
          status,
          current_url: apiResponse.currentUrl,
          updated_at: new Date().toISOString()
        };
        
        // If the task is completed or failed, add completion data
        if (status === 'completed' || status === 'failed') {
          updateData.completed_at = new Date().toISOString();
          updateData.output = apiResponse.output;
          updateData.browser_data = apiResponse.browserData;
          updateData.error_message = apiResponse.error;
        }
        
        // Update the task record
        await supabase
          .from('browser_automation_tasks')
          .update(updateData)
          .eq('id', taskId);
      }
      
      return {
        status,
        output: apiResponse.output,
        error: apiResponse.error
      };
    } catch (error) {
      console.error('Error in checkTaskStatus:', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  public async stopTask(taskId: string): Promise<boolean> {
    try {
      // Get the task to check if it exists and get the browser task ID
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id, status')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        console.error('Error fetching task:', taskError);
        return false;
      }
      
      // If the task is already completed or failed, no need to stop it
      if (taskData.status === 'completed' || taskData.status === 'failed') {
        return true;
      }
      
      // Call the API to stop the task
      const { error: apiError } = await supabase.functions.invoke('browser-use-api', {
        body: {
          operation: 'stop-task',
          taskId: taskData.browser_task_id
        }
      });
      
      if (apiError) {
        console.error('Error stopping task:', apiError);
        return false;
      }
      
      // Update the task status
      await supabase
        .from('browser_automation_tasks')
        .update({
          status: 'stopped',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      return true;
    } catch (error) {
      console.error('Error in stopTask:', error);
      return false;
    }
  }
  
  public async getTaskHistory(userId: string, limit: number = 10, offset: number = 0): Promise<BrowserAutomationTask[]> {
    try {
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) {
        console.error('Error fetching task history:', error);
        return [];
      }
      
      return data as BrowserAutomationTask[];
    } catch (error) {
      console.error('Error in getTaskHistory:', error);
      return [];
    }
  }
  
  public async saveTaskTemplate(
    userId: string,
    templateName: string,
    taskInput: string,
    browserConfig: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('browser_task_templates')
        .insert({
          user_id: userId,
          name: templateName,
          task_input: taskInput,
          browser_config: browserConfig,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving task template:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in saveTaskTemplate:', error);
      return false;
    }
  }
  
  public async getTaskTemplates(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('browser_task_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching task templates:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error in getTaskTemplates:', error);
      return [];
    }
  }
}
