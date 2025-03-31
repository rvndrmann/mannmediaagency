
import { v4 as uuidv4 } from "uuid";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { BrowserAgentService } from "../browser-automation/BrowserAgentService";

export const browserUseTool: ToolDefinition = {
  name: "browser_use",
  description: "Use a browser to navigate websites and perform actions. This tool can open websites, fill forms, click on elements, and take screenshots.",
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "A clear, detailed instruction for what should be done in the browser."
      },
      url: {
        type: "string",
        description: "Optional starting URL. If not provided, the tool will start from a blank page or decide where to go based on the task."
      },
      saveSession: {
        type: "boolean",
        description: "Whether to save cookies and session data for later use."
      }
    },
    required: ["task"]
  },
  requiredCredits: 1,
  metadata: {
    category: "browser",
    displayName: "Browser Automation",
    icon: "Globe"
  },
  execute: async (params: {
    task: string;
    url?: string;
    saveSession?: boolean;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Verify the tool is available
      if (!context.toolAvailable) {
        return {
          success: false,
          message: "Browser automation is not available in your current plan",
          error: "Tool unavailable"
        };
      }
      
      // Verify required context
      if (!context.userId) {
        return {
          success: false,
          message: "User ID is required to run browser automation",
          error: "Missing user ID in context"
        };
      }
      
      // Initialize browser agent service
      const browserService = BrowserAgentService.getInstance();
      
      // Track start time for logging
      const startTime = Date.now();
      console.log(`Starting browser task: ${params.task}`);
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Starting browser automation task: ${params.task}`, "tool_start");
      }
      
      // Start the browser task
      const result = await browserService.startBrowserTask(
        params.task,
        context.userId,
        {
          saveSessionData: params.saveSession ?? true,
          environment: "browser"
        }
      );
      
      if (!result) {
        throw new Error("Failed to start browser task");
      }
      
      const { taskId } = result;
      
      // Poll for completion (simplified version)
      let taskComplete = false;
      let taskResult = null;
      let taskError = null;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes (10 seconds * 30)
      
      while (!taskComplete && attempts < maxAttempts) {
        attempts++;
        
        // Wait 10 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check task status
        const status = await browserService.checkTaskStatus(taskId);
        
        if (status.status === 'completed') {
          taskComplete = true;
          taskResult = status.output;
        } else if (status.status === 'failed' || status.status === 'stopped') {
          taskComplete = true;
          taskError = status.error || "Task failed or was stopped";
        }
      }
      
      // If we reached max attempts, consider it timed out
      if (!taskComplete) {
        return {
          success: false,
          message: "Browser automation task timed out",
          error: "Task timeout"
        };
      }
      
      // If there was an error
      if (taskError) {
        return {
          success: false,
          message: `Browser automation task failed: ${taskError}`,
          error: taskError
        };
      }
      
      // Log completion time
      const completionTime = (Date.now() - startTime) / 1000;
      console.log(`Browser task completed in ${completionTime.toFixed(1)}s`);
      
      // Add message to the conversation log
      if (context.addMessage) {
        context.addMessage(`Completed browser automation task in ${completionTime.toFixed(1)} seconds`, "tool_complete");
      }
      
      // Return the successful result
      return {
        success: true,
        message: "Browser automation task completed successfully",
        data: taskResult,
        usage: {
          creditsUsed: 1
        }
      };
    } catch (error: any) {
      console.error("Error in browser use tool:", error);
      
      return {
        success: false,
        message: `Browser automation error: ${error.message}`,
        error: error.message
      };
    }
  }
};
