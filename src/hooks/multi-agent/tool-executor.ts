
import { Command } from "@/types/message";
import { getTool } from "./tools";
import { CommandExecutionState, ToolContext } from "./types";
import { toast } from "sonner";
import { executeTool } from "./tools/index"; // Import the correct function

export const executeCommand = async (
  commandData: Command,
  context: ToolContext
): Promise<{
  state: CommandExecutionState;
  message: string;
  data?: any;
}> => {
  try {
    // Use the new tool executor system
    const result = await executeTool(commandData.name, commandData.parameters || {}, context);
    
    // Return the result in the expected format
    return {
      state: result.state,
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
