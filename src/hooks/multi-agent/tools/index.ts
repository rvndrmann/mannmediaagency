
import { ToolContext, ToolExecutionResult, CommandExecutionState } from './types';
import { availableTools, getAvailableTools } from './tool-registry';

// Execute a tool by name with parameters
export const executeTool = async (
  toolName: string,
  parameters: Record<string, any>,
  context: ToolContext
): Promise<ToolExecutionResult> => {
  try {
    // Get all available tools
    const tools = getAvailableTools();
    
    // Find the requested tool
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return {
        success: false,
        message: `Tool with name "${toolName}" not found`,
        error: `Tool "${toolName}" not found`,
        state: CommandExecutionState.FAILED
      };
    }
    
    // Execute the tool
    return await tool.execute(parameters, context);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    
    return {
      success: false,
      message: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error),
      state: CommandExecutionState.FAILED
    };
  }
};

// Initialize tools system (if needed)
export const initializeTools = () => {
  console.log('Tool system initialized with', availableTools.length, 'tools');
  return {
    availableTools,
    executeTool
  };
};
