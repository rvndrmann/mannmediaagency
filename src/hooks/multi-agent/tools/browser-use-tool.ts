
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "@/hooks/types";

export const browserUseTool: ToolDefinition = {
  name: "browser-use",
  description: "Automate browser tasks such as web scraping, form filling, and data extraction using a virtual browser.",
  parameters: {
    task: {
      type: "string",
      description: "Description of the browser task to perform (e.g., 'Go to amazon.com and search for laptops')"
    },
    saveBrowserData: {
      type: "boolean",
      description: "Whether to save browser session data for future use",
      default: true
    }
  },
  requiredCredits: 1,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      console.log("Browser tool starting with credits:", context.creditsRemaining);
      
      // Check if user has enough credits
      if (context.creditsRemaining < 1) {
        console.error(`Insufficient credits: User has ${context.creditsRemaining} but needs 1 credit.`);
        return {
          success: false,
          message: "Insufficient credits to run browser automation. You need at least 1 credit."
        };
      }

      // Call the Supabase edge function to start the browser automation task
      const response = await supabase.functions.invoke('browser-use-api', {
        body: {
          task: params.task,
          save_browser_data: params.saveBrowserData === false ? false : true,
          user_id: context.userId
        },
      });

      if (response.error) throw new Error(response.error.message);

      const taskId = response.data?.task_id;
      
      if (!taskId) {
        throw new Error("Failed to start browser task - no task ID returned");
      }

      // Save task to history for future reference
      await supabase
        .from('browser_task_history')
        .insert({
          user_id: context.userId,
          task_input: params.task,
          status: 'running',
          browser_task_id: taskId
        });

      return {
        success: true,
        message: "✅ Browser task started successfully! You can view the progress in the Browser Use section. The task ID is: " + taskId,
        data: {
          taskId,
          status: "in_progress"
        }
      };
    } catch (error) {
      console.error("Error in browser-use tool:", error);
      return {
        success: false,
        message: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred"
      };
    }
  }
};
