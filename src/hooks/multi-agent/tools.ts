
import { CommandExecutionState, ToolContext } from "./types";
import { toast } from "sonner";
import { availableTools, executeTool, getAvailableTools, initializeTools as initializeToolSystem } from "./tools/index";

export const executeCommand = async (
  commandName: string,
  parameters: any,
  context: ToolContext
): Promise<{
  state: CommandExecutionState;
  message: string;
  data?: any;
}> => {
  try {
    // Call the centralized tool executor
    const result = await executeTool(commandName, parameters, context);
    
    return {
      state: result.state || CommandExecutionState.COMPLETED,
      message: result.message,
      data: result.data
    };
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    return {
      state: CommandExecutionState.ERROR,
      message: error instanceof Error ? error.message : `Unknown error executing ${commandName}`
    };
  }
};

// Initialize the tool system
export const initializeTools = async () => {
  try {
    await initializeToolSystem();
    console.log("Tool system initialized with", availableTools.length, "tools");
    return true;
  } catch (error) {
    console.error("Error initializing tool system:", error);
    return false;
  }
};

// Get all available tools
export const getAllTools = () => {
  return getAvailableTools();
};
