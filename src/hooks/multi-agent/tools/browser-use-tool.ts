
import { CommandExecutionState, ToolContext, ToolExecutionResult, ToolDefinition } from '../types';

interface BrowserUseParams {
  task: string;
  save_browser_data?: boolean;
}

async function executeBrowserUseTool(
  parameters: BrowserUseParams,
  context: ToolContext
): Promise<ToolExecutionResult> {
  try {
    console.log(`Executing browser task: ${parameters.task}`);
    
    if (!parameters.task) {
      return {
        success: false,
        message: `Task is required for browser automation`,
        state: CommandExecutionState.FAILED
      };
    }
    
    // Call the Supabase function to execute the browser task
    const { data, error } = await context.supabase.functions.invoke('browser-use-api', {
      body: {
        task: parameters.task,
        save_browser_data: parameters.save_browser_data || true,
        userId: context.userId
      }
    });
    
    if (error) {
      console.error('Error executing browser task:', error);
      return {
        success: false,
        message: `Failed to execute browser task: ${error.message}`,
        error: error.message,
        state: CommandExecutionState.ERROR
      };
    }
    
    console.log('Browser task submitted:', data);
    return {
      success: true,
      message: `Browser task submitted successfully. Task ID: ${data?.task_id || 'unknown'}`,
      data: { ...data },
      state: CommandExecutionState.RUNNING
    };
  } catch (error) {
    console.error("Error executing browser task:", error);
    return {
      success: false,
      message: `Failed to execute browser task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      state: CommandExecutionState.ERROR
    };
  }
}

export const browserUseTool: ToolDefinition = {
  name: "browser_use",
  description: "Run tasks in a browser automation environment",
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "The task to perform in natural language (e.g., 'Go to twitter.com and search for #AI')"
      },
      save_browser_data: {
        type: "boolean",
        description: "Whether to save browser data (cookies, local storage, etc.)"
      }
    },
    required: ["task"]
  },
  metadata: {
    category: "automation",
    displayName: "Browser Automation",
    icon: "globe"
  },
  execute: executeBrowserUseTool
};
