
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition } from "./types";
import { CommandExecutionState, ToolContext, ToolResult } from "./types";
import { getTool } from "./tools";
import { toast } from "sonner";

export interface ExecuteToolParams {
  toolName: string;
  params: Record<string, any>;
  context: ToolContext;
}

export const executeToolByName = async (
  { toolName, params, context }: ExecuteToolParams
): Promise<ToolResult> => {
  try {
    // Log tool execution for analytics
    const startTime = Date.now(); // Use numeric timestamp
    
    const tool = getTool(toolName);
    
    if (!tool) {
      return {
        success: false,
        result: "Tool not found",
        message: `The tool '${toolName}' was not found.`
      };
    }
    
    // Check if user has enough credits
    if (context.creditsRemaining !== undefined && 
        context.creditsRemaining < tool.requiredCredits) {
      return {
        success: false,
        result: "Insufficient credits",
        message: `You need at least ${tool.requiredCredits} credits to use this tool.`
      };
    }
    
    // Execute the tool
    const result = await tool.execute(params, context);
    
    // Log the execution result
    const endTime = Date.now(); // Use numeric timestamp
    const executionTime = endTime - startTime;
    
    try {
      await supabase.from('tool_executions').insert({
        tool_name: toolName,
        parameters: params,
        result: result.success,
        user_id: context.userId,
        conversation_id: context.conversationId,
        execution_time_ms: executionTime,
        error_message: result.success ? null : result.message
      });
    } catch (error) {
      // Non-blocking error - don't fail if logging fails
      console.error("Failed to log tool execution:", error);
    }
    
    // Deduct credits if successful
    if (result.success && tool.requiredCredits > 0) {
      try {
        await supabase.rpc('deduct_credits', {
          user_id_input: context.userId,
          credit_amount: tool.requiredCredits,
          description: `Used '${toolName}' tool`
        });
      } catch (error) {
        // Log credit deduction error but don't block execution
        console.error("Failed to deduct credits:", error);
        toast.error("Failed to deduct credits, but tool executed successfully");
      }
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Log failed execution
    const failTime = Date.now(); // Use numeric timestamp
    
    try {
      await supabase.from('tool_executions').insert({
        tool_name: toolName,
        parameters: params,
        result: false,
        user_id: context.userId,
        conversation_id: context.conversationId,
        execution_time_ms: 0,
        error_message: errorMessage
      });
    } catch (logError) {
      // Non-blocking
      console.error("Failed to log tool execution error:", logError);
    }
    
    return {
      success: false,
      result: "Tool execution failed",
      message: `Error: ${errorMessage}`
    };
  }
};
