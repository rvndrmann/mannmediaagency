
import { CommandExecutionState } from "./types";
import { toast } from "sonner";
import { executeTool, availableTools, initializeToolSystem as initializeToolsInternal, getAvailableTools } from "./tools/index";
import { ToolContext } from "./types";

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
      state: result.state,
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

// Export the initializeToolSystem function for initializing tools
export const initializeToolSystem = async (): Promise<boolean> => {
  try {
    console.log("Initializing tool system...");
    await initializeToolsInternal();
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
