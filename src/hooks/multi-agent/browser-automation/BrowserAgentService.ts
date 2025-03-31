import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import type { BrowserAutomationTask, BrowserConfig, BrowserTaskOptions, BrowserTaskResult, BrowserTaskStatus } from "@/types/browser-automation";

export class BrowserAgentService {
  private static instance: BrowserAgentService;
  private apiKey: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): BrowserAgentService {
    if (!BrowserAgentService.instance) {
      BrowserAgentService.instance = new BrowserAgentService();
    }
    return BrowserAgentService.instance;
  }
  
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  public async startBrowserTask(
    taskInput: string,
    userId: string,
    options: BrowserTaskOptions = {}
  ): Promise<BrowserTaskResult | null> {
    try {
      const taskId = uuidv4();
      const { environment = 'browser', applicationConfig, saveSessionData = true } = options;
      
      // Create a record in our database first
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .insert({
          id: taskId,
          user_id: userId,
          input: taskInput,
          status: 'pending',
          environment,
          applications_config: applicationConfig || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (taskError) {
        console.error('Error creating browser automation task:', taskError);
        return null;
      }
      
      // Now call the browser automation API
      const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey || process.env.BROWSER_USE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          task: taskInput,
          save_browser_data: saveSessionData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error from browser automation API:', errorText);
        
        // Update the task status to failed
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'failed',
            error_message: errorText,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        return null;
      }
      
      const responseData = await response.json();
      
      // Update our database record with the browser task ID
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: 'running',
          browser_task_id: responseData.id,
          live_url: responseData.live_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      return {
        taskId,
        liveUrl: responseData.live_url
      };
    } catch (error) {
      console.error('Error starting browser task:', error);
      return null;
    }
  }
  
  public async checkTaskStatus(taskId: string): Promise<BrowserTaskStatus> {
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
      
      // If the task is already completed or failed, return the status
      if (taskData.status === 'completed' || taskData.status === 'failed') {
        return { 
          status: taskData.status,
          output: taskData.output || null,
          error: taskData.error || null  // Changed from error_message to error to match the type
        };
      }
      
      // Otherwise, get the status from the browser API
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskData.browser_task_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey || process.env.BROWSER_USE_API_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching task status:', errorText);
        return { status: 'error', error: errorText };
      }
      
      const responseData = await response.json();
      
      // Map the API status to our status
      let status = 'running' as 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'pending' | 'expired';
      if (responseData.status === 'finished') {
        status = 'completed';
      } else if (responseData.status === 'failed') {
        status = 'failed';
      } else if (responseData.status === 'stopped') {
        status = 'stopped';
      } else if (responseData.status === 'paused') {
        status = 'paused';
      }
      
      // Update our database record
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: status,
          output: responseData.output || null,
          error: responseData.error || null,  // Changed from error_message to error
          current_url: responseData.current_url || null,
          browser_data: responseData.browser_data || null,
          updated_at: new Date().toISOString(),
          completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);
      
      return {
        status,
        output: responseData.output || null,
        error: responseData.error || null
      };
    } catch (error) {
      console.error('Error checking task status:', error);
      return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  public async stopTask(taskId: string): Promise<boolean> {
    try {
      // First get the task from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        console.error('Error fetching task for stopping:', taskError);
        return false;
      }
      
      // Call the browser API to stop the task
      const response = await fetch(`https://api.browser-use.com/api/v1/stop-task?task_id=${taskData.browser_task_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey || process.env.BROWSER_USE_API_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error stopping task:', errorText);
        return false;
      }
      
      // Update our database record
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      return true;
    } catch (error) {
      console.error('Error stopping task:', error);
      return false;
    }
  }
  
  public async pauseTask(taskId: string): Promise<boolean> {
    try {
      // First get the task from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        console.error('Error fetching task for pausing:', taskError);
        return false;
      }
      
      // Call the browser API to pause the task
      const response = await fetch(`https://api.browser-use.com/api/v1/pause-task?task_id=${taskData.browser_task_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey || process.env.BROWSER_USE_API_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error pausing task:', errorText);
        return false;
      }
      
      // Update our database record
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      return true;
    } catch (error) {
      console.error('Error pausing task:', error);
      return false;
    }
  }
  
  public async resumeTask(taskId: string): Promise<boolean> {
    try {
      // First get the task from our database
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('browser_task_id')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        console.error('Error fetching task for resuming:', taskError);
        return false;
      }
      
      // Call the browser API to resume the task
      const response = await fetch(`https://api.browser-use.com/api/v1/resume-task?task_id=${taskData.browser_task_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey || process.env.BROWSER_USE_API_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error resuming task:', errorText);
        return false;
      }
      
      // Update our database record
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          status: 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      return true;
    } catch (error) {
      console.error('Error resuming task:', error);
      return false;
    }
  }
  
  public async getTask(taskId: string): Promise<BrowserAutomationTask | null> {
    try {
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) {
        console.error('Error getting task:', error);
        return null;
      }
      
      return data as BrowserAutomationTask;
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }
  
  public async getTaskHistory(userId: string): Promise<BrowserAutomationTask[]> {
    try {
      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error getting task history:', error);
        return [];
      }
      
      return data as BrowserAutomationTask[];
    } catch (error) {
      console.error('Error getting task history:', error);
      return [];
    }
  }
  
  async getTaskDetails(taskId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (fetchError) {
        console.error("Error fetching task details:", fetchError);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error("Error in getTaskDetails:", err);
      return null;
    }
  }
  
  async getTaskStatus(taskId: string) {
    try {
      const task = await this.getTaskDetails(taskId);
      if (!task) {
        return {
          status: 'unknown',
          message: 'Task not found'
        };
      }
      
      return {
        status: task.status,
        message: task.status === 'failed' || task.status === 'error' 
          ? (task.output || 'Task failed') 
          : `Task is ${task.status}`,
        output: task.output,
        progress: task.progress || 0
      };
    } catch (err) {
      console.error("Error getting task status:", err);
      return {
        status: 'error',
        message: 'Error checking task status'
      };
    }
  }
}

export const browserAgentService = new BrowserAgentService();
