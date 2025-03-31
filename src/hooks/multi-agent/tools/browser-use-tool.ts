
import { RunnerContext } from "../runner/types";
import { ToolExecutionResult, ToolDefinition, ToolContext } from "../types";

export const browserUseTool: ToolDefinition = {
  name: "browser_use",
  description: "Run browser automation tasks using the browser-use.com API",
  requiredCredits: 5,
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "The browser automation task to execute"
      },
      save_browser_data: {
        type: "boolean",
        description: "Whether to save browser session data (cookies, etc.)"
      }
    },
    required: ["task"]
  },
  metadata: {
    category: "automation",
    displayName: "Browser Automation",
    icon: "Browser"
  },
  execute: async (params: { 
    task: string;
    save_browser_data?: boolean;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Check if API token is available
      const apiToken = context.metadata?.browserUseApiToken;
      
      if (!apiToken) {
        return {
          success: false,
          message: "Browser-use API token not configured",
          error: "Missing API token",
          data: null
        };
      }
      
      // Validate task input
      if (!params.task || params.task.trim() === '') {
        return {
          success: false,
          message: "Task description is required",
          error: "Missing task description",
          data: null
        };
      }
      
      // Call the browser-use API through Supabase Edge Function
      const { data, error } = await context.supabase.functions.invoke('browser-use-api', {
        body: {
          operation: 'run-task',
          task: params.task,
          save_browser_data: params.save_browser_data ?? true,
          userId: context.userId
        }
      });
      
      if (error) {
        console.error("Browser-use API error:", error);
        return {
          success: false,
          message: `Failed to execute browser task: ${error.message}`,
          error: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: "Browser automation task initiated successfully",
        data: {
          taskId: data.taskId,
          liveUrl: data.liveUrl,
          message: data.message,
          status: data.status
        },
        usage: {
          creditsUsed: data.creditsUsed || 5
        }
      };
    } catch (error) {
      console.error("Error in browser-use tool:", error);
      return {
        success: false,
        message: `An error occurred during browser automation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }
};
