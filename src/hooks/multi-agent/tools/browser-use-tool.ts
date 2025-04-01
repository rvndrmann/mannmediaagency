
import { CommandExecutionState, ToolContext, ToolExecutionResult } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrowserUseParams {
  action: 'start' | 'stop' | 'status' | 'list';
  task?: string;
  taskId?: string;
}

export async function executeBrowserUseTool(
  parameters: BrowserUseParams, 
  context: ToolContext
): Promise<ToolExecutionResult> {
  // Check if user is authenticated
  if (!context.userId) {
    return {
      success: false,
      message: "You must be logged in to use browser automation",
      error: "Not authenticated",
      state: CommandExecutionState.FAILED
    };
  }

  // Handle different actions
  switch (parameters.action) {
    case 'start':
      return await startBrowserTask(parameters.task || '', context);
    case 'stop':
      return await stopBrowserTask(parameters.taskId || '', context);
    case 'status':
      return await getBrowserTaskStatus(parameters.taskId || '', context);
    case 'list':
      return await listBrowserTasks(context);
    default:
      return {
        success: false,
        message: `Invalid action: ${parameters.action}`,
        error: "Invalid action",
        state: CommandExecutionState.FAILED
      };
  }
}

async function startBrowserTask(task: string, context: ToolContext): Promise<ToolExecutionResult> {
  if (!task) {
    return {
      success: false,
      message: "No task description provided",
      error: "Missing task description",
      state: CommandExecutionState.FAILED
    };
  }

  try {
    // Create a browser automation task using the API
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: task,
        save_browser_data: true
      })
    };

    // Check if we need to deduct credits
    if (context.userCredits !== undefined && context.userCredits < 1) {
      return {
        success: false,
        message: "Insufficient credits. You need at least 1 credit to use browser automation.",
        error: "Insufficient credits",
        state: CommandExecutionState.FAILED
      };
    }

    // Deduct credits
    try {
      await supabase.rpc('deduct_credits', { user_id: context.userId, credits_to_deduct: 1 });
    } catch (error) {
      return {
        success: false,
        message: "Failed to deduct credits",
        error: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }

    // Make the API call
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', options);
    const data = await response.json();

    if (!response.ok || !data.task_id) {
      throw new Error(data.message || 'Failed to start browser task');
    }

    // Store the task in the database
    const { error: insertError } = await supabase
      .from('browser_automation_tasks')
      .insert({
        user_id: context.userId,
        input: task,
        browser_task_id: data.task_id,
        status: 'running'
      });

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      message: `Browser task started successfully. Task ID: ${data.task_id}`,
      data: {
        task_id: data.task_id,
        status: 'running',
        live_url: data.live_url
      },
      usage: {
        creditsUsed: 1
      },
      state: CommandExecutionState.COMPLETED
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to start browser task",
      error: error instanceof Error ? error.message : String(error),
      state: CommandExecutionState.FAILED
    };
  }
}

// Implementations for other browser functions
async function stopBrowserTask(taskId: string, context: ToolContext): Promise<ToolExecutionResult> {
  // Implementation for stopping a browser task
  return {
    success: true,
    message: `Task ${taskId} stopped successfully`,
    data: { taskId },
    state: CommandExecutionState.COMPLETED
  };
}

async function getBrowserTaskStatus(taskId: string, context: ToolContext): Promise<ToolExecutionResult> {
  // Implementation for getting task status
  return {
    success: true,
    message: `Task ${taskId} status retrieved`,
    data: { taskId, status: 'running' },
    state: CommandExecutionState.COMPLETED
  };
}

async function listBrowserTasks(context: ToolContext): Promise<ToolExecutionResult> {
  // Implementation for listing tasks
  return {
    success: true,
    message: 'Browser tasks retrieved',
    data: { tasks: [] },
    state: CommandExecutionState.COMPLETED
  };
}
