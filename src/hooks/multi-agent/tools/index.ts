
import { CommandExecutionState, ToolExecutionResult } from "../runner/types";
import { ToolContext } from "../types";
import { canvasTool } from "./canvas-tool";

export interface Tool {
  name: string;
  description: string;
  parameters: any;
  metadata?: any;
  execute: (params: any, context: ToolContext) => Promise<ToolExecutionResult>;
}

// Register all available tools here
export const availableTools: Tool[] = [
  canvasTool
  // Add other tools here as needed
];

/**
 * Get all available tools
 */
export const getAvailableTools = (): Tool[] => {
  return availableTools;
};

/**
 * Initialize the tool system
 */
export const initializeToolSystem = async (): Promise<void> => {
  // Perform any necessary initialization
  console.log(`Tool system initialized with ${availableTools.length} tools`);
};

/**
 * Find a tool by name
 */
const findTool = (name: string): Tool | undefined => {
  return availableTools.find(tool => tool.name === name);
};

/**
 * Execute a tool by name
 */
export const executeTool = async (
  name: string,
  parameters: any,
  context: ToolContext
): Promise<ToolExecutionResult> => {
  try {
    const tool = findTool(name);
    
    if (!tool) {
      return {
        success: false,
        message: `Tool not found: ${name}`,
        state: CommandExecutionState.ERROR
      };
    }
    
    // Execute the tool
    const result = await tool.execute(parameters, context);
    
    if (!result.state) {
      // Set default state based on success
      result.state = result.success ? CommandExecutionState.COMPLETED : CommandExecutionState.ERROR;
    }
    
    return result;
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      success: false,
      message: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      state: CommandExecutionState.ERROR
    };
  }
};
