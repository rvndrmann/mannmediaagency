import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

// Types for browser automation
export interface BrowserAutomationTask {
  id: string;
  status: 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'failed';
  task: string;
  output?: any;
  created_at: string;
  finished_at?: string;
  media?: {
    recording_url?: string;
  }
}

export interface BrowserAutomationOptions {
  save_browser_data?: boolean;
  headless?: boolean;
  timeout?: number;
}

/**
 * Service for managing browser automation tasks
 */
export class BrowserAgentService {
  private static instance: BrowserAgentService;
  private apiKey: string | null = null;
  
  private constructor() {
    // Initialize with API key from environment if available
    this.apiKey = import.meta.env.VITE_BROWSER_API_KEY || null;
  }
  
  static getInstance(): BrowserAgentService {
    if (!BrowserAgentService.instance) {
      BrowserAgentService.instance = new BrowserAgentService();
    }
    return BrowserAgentService.instance;
  }
  
  /**
   * Run a browser automation task
   */
  async runTask(
    task: string, 
    options: BrowserAutomationOptions = { save_browser_data: true }
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      // Make API request to start a task
      const response = await fetch("https://api.browser-use.com/api/v1/run-task", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          task,
          ...options
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to run task: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Save task record to database
      await this.saveTaskToDatabase({
        id: data.task_id,
        task,
        status: 'created',
        created_at: new Date().toISOString()
      });
      
      return data.task_id;
    } catch (error) {
      console.error("Error running browser automation task:", error);
      throw error;
    }
  }
  
  /**
   * Get task status and details
   */
  async getTask(taskId: string): Promise<BrowserAutomationTask> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get task: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update task in database
      if (data.status === 'finished' || data.status === 'failed') {
        await this.updateTaskInDatabase(taskId, {
          status: data.status,
          output: data.output,
          finished_at: new Date().toISOString()
        });
      }
      
      return data;
    } catch (error) {
      console.error("Error getting browser automation task:", error);
      throw error;
    }
  }
  
  /**
   * Stop a running task
   */
  async stopTask(taskId: string): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch(`https://api.browser-use.com/api/v1/stop-task?task_id=${taskId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to stop task: ${errorData.message || response.statusText}`);
      }
      
      // Update task status in database
      await this.updateTaskInDatabase(taskId, {
        status: 'stopped',
        finished_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error stopping browser automation task:", error);
      throw error;
    }
  }
  
  /**
   * Pause a running task
   */
  async pauseTask(taskId: string): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch(`https://api.browser-use.com/api/v1/pause-task?task_id=${taskId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to pause task: ${errorData.message || response.statusText}`);
      }
      
      // Update task status in database
      await this.updateTaskInDatabase(taskId, {
        status: 'paused'
      });
    } catch (error) {
      console.error("Error pausing browser automation task:", error);
      throw error;
    }
  }
  
  /**
   * Resume a paused task
   */
  async resumeTask(taskId: string): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch(`https://api.browser-use.com/api/v1/resume-task?task_id=${taskId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to resume task: ${errorData.message || response.statusText}`);
      }
      
      // Update task status in database
      await this.updateTaskInDatabase(taskId, {
        status: 'running'
      });
    } catch (error) {
      console.error("Error resuming browser automation task:", error);
      throw error;
    }
  }
  
  /**
   * Get task media recordings
   */
  async getTaskMedia(taskId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/media`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get task media: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update task in database with media information
      if (data.recording_url) {
        await this.updateTaskInDatabase(taskId, {
          media: {
            recording_url: data.recording_url
          }
        });
      }
      
      return data;
    } catch (error) {
      console.error("Error getting browser automation task media:", error);
      throw error;
    }
  }
  
  /**
   * Get user's credit balance
   */
  async getBalance(): Promise<number> {
    try {
      if (!this.apiKey) {
        throw new Error("Browser automation API key not configured");
      }
      
      const response = await fetch("https://api.browser-use.com/api/v1/balance", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get balance: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.balance;
    } catch (error) {
      console.error("Error getting browser automation balance:", error);
      throw error;
    }
  }
  
  /**
   * Save task to database
   */
  private async saveTaskToDatabase(task: Partial<BrowserAutomationTask>): Promise<void> {
    try {
      const { error } = await supabase
        .from('browser_automation_tasks')
        .insert([task]);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving task to database:", error);
    }
  }
  
  /**
   * Update task in database
   */
  private async updateTaskInDatabase(taskId: string, updates: Partial<BrowserAutomationTask>): Promise<void> {
    try {
      const { error } = await supabase
        .from('browser_automation_tasks')
        .update(updates)
        .eq('id', taskId);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating task in database:", error);
    }
  }
  
  async batchInsertTasks(tasks: Partial<BrowserAutomationTask>[]): Promise<void> {
    try {
      // Make sure each task has the required fields
      const validTasks = tasks.filter(task => task.input && task.user_id);
      
      if (validTasks.length === 0) {
        console.warn("No valid tasks to insert");
        return;
      }
      
      // Insert one by one to avoid the type error
      for (const task of validTasks) {
        await this.supabase.from('browser_automation_tasks').insert(task);
      }
      
      console.log(`${validTasks.length} tasks inserted successfully`);
    } catch (error) {
      console.error("Error batch inserting tasks:", error);
      throw error;
    }
  }
}
