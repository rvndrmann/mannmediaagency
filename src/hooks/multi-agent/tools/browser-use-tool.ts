
import { ToolResult } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BrowserUseToolParams {
  task: string;
  environment?: string;
}

export const browserUseTool = {
  name: "browser-use",
  description: "Start a browser automation task with the specified instructions",
  requiredCredits: 1,
  parameters: {
    task: {
      type: "string",
      description: "Clear instructions for what to do in the browser"
    },
    environment: {
      type: "string",
      description: "Environment to use (browser or desktop)",
      enum: ["browser", "desktop"],
      default: "browser"
    }
  },
  execute: async (params: BrowserUseToolParams, context: any): Promise<ToolResult> => {
    try {
      // Validate parameters
      if (!params.task || params.task.trim() === "") {
        return {
          success: false,
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
          data: {
            error: "Insufficient credits. You need at least 1 credit."
          }
        };
      }

      // Call the edge function to start a browser use task
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          task: params.task,
          environment: params.environment || "browser"
        }
      });

      if (error) {
        console.error("Error starting browser task:", error);
        return {
          success: false,
          data: {
            error: `Failed to start browser task: ${error.message}`
          }
        };
      }

      // Return success with the task ID and link to view
      return {
        success: true,
        data: {
          taskId: data.taskId,
          message: "Browser automation task started successfully",
          viewUrl: `/browser-use?task=${data.taskId}`,
          taskDescription: params.task
        }
      };
    } catch (error) {
      console.error("Error in browser use tool:", error);
      return {
        success: false,
        data: {
          error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
};
