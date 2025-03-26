
import { ToolResult, ToolContext, ToolParameter } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Command } from "@/types/message";

interface BrowserUseToolParams {
  task: string;
  environment?: "browser" | "desktop";
  browser_config?: any;
}

export const browserUseTool = {
  name: "browser-use",
  description: "Start a browser or desktop automation task with the specified instructions",
  requiredCredits: 1,
  parameters: [
    {
      name: "task",
      type: "string",
      description: "Clear instructions for what to do in the browser or on the desktop",
      required: true
    },
    {
      name: "environment",
      type: "string",
      description: "Environment to use (browser or desktop)",
      required: false
    },
    {
      name: "browser_config",
      type: "object",
      description: "Optional browser configuration including connection methods, resolution, desktop options, etc.",
      required: false
    }
  ],
  execute: async (command: Command, context: ToolContext): Promise<ToolResult> => {
    try {
      // Extract parameters from the command
      const params = command.parameters || {};
      const task = params.task as string;
      const environment = params.environment as string || "browser";
      const browser_config = params.browser_config || {};

      // Validate parameters
      if (!task || task.trim() === "") {
        return {
          success: false,
          message: "Task description is required",
          data: {
            error: "Task description is required"
          }
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to use browser automation");
        return {
          success: false,
          message: "Authentication required",
          data: {
            error: "Authentication required"
          }
        };
      }

      // Check if user has enough credits
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .single();

      if (creditsError || !userCredits || userCredits.credits_remaining < 1) {
        toast.error("You need at least 1 credit to use browser automation");
        return {
          success: false,
          message: "Insufficient credits. You need at least 1 credit.",
          data: {
            error: "Insufficient credits. You need at least 1 credit."
          }
        };
      }

      // Validate environment before calling the edge function
      const browserConfig = browser_config || {};
      
      // For desktop mode, validate connection configuration
      if (environment === "desktop") {
        // Check if any connection method is provided
        const hasConnectionMethod = 
          browserConfig.wssUrl || 
          browserConfig.cdpUrl || 
          browserConfig.browserInstancePath ||
          (browserConfig.useOwnBrowser && browserConfig.chromePath);
        
        if (!hasConnectionMethod) {
          toast.error("Desktop mode requires a connection method");
          return {
            success: false,
            message: "Desktop mode requires a connection method (wssUrl, cdpUrl, browserInstancePath, or chromePath with useOwnBrowser enabled).",
            data: {
              error: "Missing desktop connection configuration"
            }
          };
        }
        
        // If using browser instance path or local Chrome, ensure useOwnBrowser is enabled
        if ((browserConfig.browserInstancePath || browserConfig.chromePath) && !browserConfig.useOwnBrowser) {
          toast.error("When using local Chrome or browser instance, 'useOwnBrowser' must be enabled");
          return {
            success: false,
            message: "When using local Chrome or browser instance, 'useOwnBrowser' must be enabled.",
            data: {
              error: "Invalid desktop configuration"
            }
          };
        }
      }

      // Call the edge function to start a browser use task
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          task: task,
          environment: environment,
          browser_config: browserConfig
        }
      });

      if (error) {
        console.error("Error starting browser task:", error);
        return {
          success: false,
          message: `Failed to start browser task: ${error.message}`,
          data: {
            error: `Failed to start browser task: ${error.message}`
          }
        };
      }

      // Return success with the task ID and link to view
      return {
        success: true,
        message: `${environment === 'desktop' ? 'Desktop' : 'Browser'} automation task started successfully`,
        data: {
          taskId: data.taskId,
          message: `${environment === 'desktop' ? 'Desktop' : 'Browser'} automation task started successfully`,
          viewUrl: `/browser-use?task=${data.taskId}`,
          taskDescription: task,
          environment: environment
        }
      };
    } catch (error) {
      console.error("Error in browser use tool:", error);
      return {
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
};
