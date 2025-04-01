
import { ToolContext, ToolExecutionResult, CommandExecutionState, ToolDefinition } from './tools/types';
import { availableTools, getAvailableTools } from './tools/tool-registry';
import { errorToString } from './common-types';

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

// Function to adapt a tool definition to ensure error is always a string
export function adaptToolDefinition(tool: ToolDefinition): ToolDefinition {
  return {
    ...tool,
    execute: async (params: any, context: ToolContext) => {
      try {
        // Call the original execute function
        const result = await tool.execute(params, context);
        
        // Convert Error objects to strings for compatibility
        const errorValue = result.error ? (result.error instanceof Error ? result.error.message : String(result.error)) : undefined;
        
        // Return an adapted result
        return {
          ...result,
          error: errorValue
        };
      } catch (error) {
        // Handle any errors from tool execution
        console.error(`Error executing tool ${tool.name}:`, error);
        const errorStr = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error executing tool ${tool.name}: ${errorStr}`,
          error: errorStr,
          state: CommandExecutionState.FAILED
        };
      }
    }
  };
}

// Import the tools
import { canvasTool } from './tools/canvas-tool';
import { canvasContentTool } from './tools/canvas-content-tool';
import { dataTool, browserUseTool } from './tools/tool-registry';
import { productShotV2Tool } from './tools/product-shot-v2-tool';
import { imageToVideoTool } from './tools/image-to-video-tool';

// Create a list of adapted tools
export const adaptedTools = [
  adaptToolDefinition(canvasTool),
  adaptToolDefinition(canvasContentTool),
  adaptToolDefinition(dataTool),
  adaptToolDefinition(browserUseTool),
  adaptToolDefinition(productShotV2Tool),
  adaptToolDefinition(imageToVideoTool)
];

// Function to get all available tools
export const getAdaptedTools = (): ToolDefinition[] => {
  return [...adaptedTools];
};
