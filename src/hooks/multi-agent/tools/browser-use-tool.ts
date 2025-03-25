
import { supabase } from "@/integrations/supabase/client";
import { ToolResult } from "../types";

export const executeBrowserUseTool = async (parameters: any, context: any): Promise<ToolResult> => {
  console.log("Executing browser-use tool with parameters:", parameters);
  
  try {
    if (!parameters.task) {
      throw new Error("Task parameter is required");
    }

    // Call the execute-tool edge function
    const { data, error } = await supabase.functions.invoke("execute-tool", {
      body: {
        toolName: "browser-use",
        parameters,
        userId: context.userId,
        traceId: context.traceId
      }
    });

    if (error) {
      console.error("Error calling execute-tool function:", error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.message || "Unknown error executing browser-use tool");
    }

    return {
      success: true,
      message: `Browser task submitted successfully. You can track it with task ID: ${data.taskId}`,
      data: {
        taskId: data.taskId
      },
      credits_used: 1
    };
  } catch (error) {
    console.error("Error in executeBrowserUseTool:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error executing browser-use tool"
    };
  }
};
