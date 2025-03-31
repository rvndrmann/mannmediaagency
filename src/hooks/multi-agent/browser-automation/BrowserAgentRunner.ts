
import { v4 as uuidv4 } from "uuid";
import { BrowserAgentService, BrowserAutomationTask } from "./BrowserAgentService";
import { RunnerContext } from "../runner/types";

export interface BrowserAgentRunnerOptions {
  apiKey?: string;
  save_browser_data?: boolean;
  headless?: boolean;
  timeout?: number;
  onStatusChange?: (status: string) => void;
  onComplete?: (output: any) => void;
  onError?: (error: Error) => void;
}

export class BrowserAgentRunner {
  private service: BrowserAgentService;
  private options: BrowserAgentRunnerOptions;
  private currentTaskId: string | null = null;
  private taskPollingInterval: any = null;
  private sessionId: string;
  
  constructor(options: BrowserAgentRunnerOptions = {}) {
    this.service = BrowserAgentService.getInstance();
    this.options = {
      save_browser_data: true,
      headless: false,
      timeout: 60000,
      ...options
    };
    this.sessionId = uuidv4();
  }
  
  /**
   * Run a browser agent task
   */
  async runTask(task: string, context?: RunnerContext): Promise<string> {
    try {
      // Start the task
      const taskId = await this.service.runTask(task, {
        save_browser_data: this.options.save_browser_data
      });
      
      this.currentTaskId = taskId;
      
      // Start polling for status
      this.startPolling(taskId);
      
      return taskId;
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Start polling for task status
   */
  private startPolling(taskId: string): void {
    // Clear any existing polling
    this.stopPolling();
    
    // Start new polling interval
    this.taskPollingInterval = setInterval(async () => {
      try {
        const task = await this.service.getTask(taskId);
        
        // Notify of status change
        if (this.options.onStatusChange) {
          this.options.onStatusChange(task.status);
        }
        
        // Handle task completion
        if (task.status === 'finished' || task.status === 'failed' || task.status === 'stopped') {
          this.stopPolling();
          
          if (task.status === 'finished' && this.options.onComplete) {
            this.options.onComplete(task.output);
          } else if (task.status === 'failed' && this.options.onError) {
            this.options.onError(new Error("Browser automation task failed"));
          }
        }
      } catch (error) {
        if (this.options.onError) {
          this.options.onError(error as Error);
        }
        this.stopPolling();
      }
    }, 3000);
  }
  
  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.taskPollingInterval) {
      clearInterval(this.taskPollingInterval);
      this.taskPollingInterval = null;
    }
  }
  
  /**
   * Stop the current task
   */
  async stopTask(): Promise<void> {
    if (!this.currentTaskId) {
      throw new Error("No active task to stop");
    }
    
    try {
      await this.service.stopTask(this.currentTaskId);
      this.stopPolling();
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Pause the current task
   */
  async pauseTask(): Promise<void> {
    if (!this.currentTaskId) {
      throw new Error("No active task to pause");
    }
    
    try {
      await this.service.pauseTask(this.currentTaskId);
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Resume the current task
   */
  async resumeTask(): Promise<void> {
    if (!this.currentTaskId) {
      throw new Error("No active task to resume");
    }
    
    try {
      await this.service.resumeTask(this.currentTaskId);
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Get the current task details
   */
  async getCurrentTask(): Promise<BrowserAutomationTask | null> {
    if (!this.currentTaskId) {
      return null;
    }
    
    try {
      return await this.service.getTask(this.currentTaskId);
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Get the current task ID
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopPolling();
  }
}
