
import { CommandExecutionState, ToolContext, ToolExecutionResult } from "../types";
import { availableTools, getToolByName } from "./tool-registry";
import { canvasTool } from "./canvas-tool";
import { canvasProjectTool } from "./default-tools/canvas-project-tool"; 

// Export the tools for use in other modules
export { canvasTool, canvasProjectTool };

/**
 * Execute a tool by name with the given parameters and context
 */
export const executeTool = async (
  toolName: string, 
  parameters: any, 
  context: ToolContext
): Promise<ToolExecutionResult> => {
  // Find the tool by name
  const tool = getToolByName(toolName);
  
  if (!tool) {
    console.warn(`Tool ${toolName} not found`);
    return {
      success: false,
      message: `Tool ${toolName} not found or is not available`,
      state: CommandExecutionState.FAILED
    };
  }

  // Check if the tool requires credits and if user has enough
  if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
    return {
      success: false,
      message: `Insufficient credits to use tool ${toolName}. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`,
      state: CommandExecutionState.FAILED
    };
  }

  try {
    // Execute the tool
    const result = await tool.execute(parameters, context);
    return result;
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      message: `Error executing tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error),
      state: CommandExecutionState.ERROR
    };
  }
};

// Initialize the tool system
export const initializeTools = () => {
  console.log(`Initialized ${availableTools.length} tools`);
};
