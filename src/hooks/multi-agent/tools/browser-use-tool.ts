import { ToolContext, ToolExecutionResult } from "../types";

export const browserUseTool: ToolDefinition = {
  name: "browser-use",
  description: "Automate browser tasks including browsing websites, taking screenshots, and filling forms",
  requiredCredits: 1,
  version: "1.0.0",
  parameters: {
    task: {
      type: "string",
      description: "The task to perform in natural language (e.g., 'go to google.com and search for AI news')",
      required: true
    },
    browserConfig: {
      type: "object",
      description: "Optional browser configuration",
      required: false,
      properties: {
        headless: {
          type: "boolean",
          description: "Whether to run the browser in headless mode",
          default: true
        },
        proxy: {
          type: "string",
          description: "Optional proxy to use (format: 'protocol://host:port')",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds",
          default: 60000
        }
      }
    },
    save_browser_data: {
      type: "boolean",
      description: "Whether to save browser cookies and session data for future use",
      default: true
    }
  },

  async execute(params: any, context: ToolContext): Promise<ToolExecutionResult> {
    try {
      console.log("Executing Browser-Use Tool with params:", params);
      
      // Check if API key is available through environment or context
      const apiKey = context.metadata?.browserUseApiKey || process.env.BROWSER_USE_API_KEY;
      
      if (!apiKey) {
        throw new Error("Browser-Use API key not found");
      }

      // Check if user has enough credits
      if (context.creditsRemaining !== undefined && context.creditsRemaining < this.requiredCredits) {
        return {
          success: false,
          error: `Insufficient credits. You need ${this.requiredCredits} credits, but have ${context.creditsRemaining}.`,
          data: null
        };
      }

      // Call the Supabase function to execute the browser automation task
      const { data, error } = await context.supabase.functions.invoke('browser-use-api', {
        body: {
          task: params.task,
          browserConfig: params.browserConfig || {},
          save_browser_data: params.save_browser_data !== false,
          userId: context.userId,
          runId: context.runId
        }
      });

      if (error) {
        console.error("Browser-Use API error:", error);
        return {
          success: false,
          error: `Browser automation failed: ${error.message}`,
          data: null
        };
      }

      context.addMessage(`Browser automation task started: "${params.task}"`, "tool");

      return {
        success: true,
        data: {
          taskId: data.taskId,
          liveUrl: data.liveUrl,
          message: "Browser automation task started. You can check progress in the task monitor.",
          status: "running"
        },
        usage: {
          creditsUsed: this.requiredCredits
        }
      };
    } catch (error: any) {
      console.error("Error executing browser-use tool:", error);
      return {
        success: false,
        error: `Failed to execute browser automation: ${error.message}`,
        data: null
      };
    }
  }
};
