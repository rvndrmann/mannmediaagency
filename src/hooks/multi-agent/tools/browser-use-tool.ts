
import { CommandExecutionState } from "../types";
import { RunnerContext, ToolExecutionResult } from "../types";
import { ToolDefinition } from "../types";

export const browserUseTool: ToolDefinition = {
  name: "browser_automation",
  description: "Automate browser tasks including form filling, navigation, clicking, and data extraction, to complete tasks on websites",
  requiredCredits: 10,
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "A detailed description of the task to perform in the browser. Be specific about what websites to visit and what actions to take."
      },
      save_browser_data: {
        type: "boolean",
        description: "Whether to save browser cookies and session data for later use, useful for maintaining login state across tasks."
      }
    },
    required: ["task"]
  },
  metadata: {
    category: "automation",
    displayName: "Browser Automation",
    icon: "Browser"
  },
  execute: async (parameters: { task: string, save_browser_data?: boolean }, context: RunnerContext): Promise<ToolExecutionResult> => {
    try {
      console.log("Executing Browser Automation tool with task:", parameters.task);
      
      // Validate parameters
      if (!parameters.task || parameters.task.trim() === "") {
        return {
          success: false,
          message: "Task description cannot be empty",
          error: "Task description cannot be empty",
          data: null
        };
      }
      
      // Check if user has enough credits
      if (context.credits !== undefined && context.credits < 10) {
        return {
          success: false,
          message: "Insufficient credits. Browser automation requires 10 credits.",
          error: "Insufficient credits. Browser automation requires 10 credits.",
          data: null
        };
      }
      
      // Call the browser automation API
      const { data, error } = await context.supabase.functions.invoke('browser-automation', {
        body: {
          task: parameters.task,
          save_browser_data: parameters.save_browser_data || false,
          userId: context.userId
        }
      });
      
      if (error) {
        console.error("Browser automation error:", error);
        return {
          success: false,
          message: `Browser automation failed: ${error.message}`,
          error: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: `Browser task submitted. ${data.message || ''}`,
        data: {
          taskId: data.taskId,
          liveUrl: data.liveUrl,
          message: data.message || "You can monitor the task execution in real-time.",
          status: data.status || "running"
        },
        usage: {
          creditsUsed: data.creditsUsed || 10
        }
      };
    } catch (error) {
      console.error("Browser automation execution error:", error);
      return {
        success: false,
        message: `An error occurred during browser automation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }
};
