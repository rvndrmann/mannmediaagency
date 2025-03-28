
import { Command } from "@/types/message";
import { getTool } from "./tools";
import { CommandExecutionState, ToolContext } from "./types";
import { toast } from "sonner";

interface ExecutionResult {
  state: CommandExecutionState;
  message: string;
  data?: any;
}

export const executeCommand = async (
  commandData: Command,
  context: ToolContext
): Promise<ExecutionResult> => {
  try {
    // Find the tool with the given name
    const tool = getTool(commandData.name);
    
    if (!tool) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Tool "${commandData.name}" not found.`
      };
    }
    
    // Check if user has enough credits to execute the tool
    if (
      typeof tool.requiredCredits === 'number' && 
      tool.requiredCredits > 0 &&
      context.creditsRemaining !== undefined &&
      context.creditsRemaining < tool.requiredCredits
    ) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Insufficient credits to execute tool "${commandData.name}". Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining || 0}`
      };
    }
    
    // Execute the tool
    const result = await tool.execute(commandData);
    
    if (!result.success) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Tool execution failed: ${result.message}`
      };
    }
    
    return {
      state: CommandExecutionState.COMPLETED,
      message: result.message,
      data: result.data
    };
  } catch (error) {
    console.error("Tool execution error:", error);
    return {
      state: CommandExecutionState.FAILED,
      message: `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
