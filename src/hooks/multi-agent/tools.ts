
import { ToolContext, ToolDefinition, CommandExecutionState } from './tools/types';
import { dataTool } from './tools/tool-registry';
import { browserUseTool } from './tools/tool-registry';
import { canvasTool } from './tools/default-tools/canvas-tool';

// Helper to ensure error is a string
export const errorToString = (error: unknown): string => {
  if (error === null || error === undefined) {
    return 'Unknown error';
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

// Type interface for tool execution results
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
  state: CommandExecutionState;
  usage?: {
    creditsUsed?: number;
  };
}

// Create wrapper for tool definitions to ensure error is always string
export const adaptToolDefinition = (tool: any): ToolDefinition => {
  const originalExecute = tool.execute;

  return {
    ...tool,
    execute: async (parameters: any, context: ToolContext): Promise<ToolExecutionResult> => {
      try {
        const result = await originalExecute(parameters, context);
        
        // Ensure error is always a string if present
        if (result.error) {
          return {
            ...result,
            error: errorToString(result.error)
          };
        }
        
        return result;
      } catch (error) {
        return {
          success: false,
          message: `Error executing tool ${tool.name}: ${errorToString(error)}`,
          error: errorToString(error),
          state: CommandExecutionState.FAILED
        };
      }
    }
  };
};

// Adapt tools to ensure consistent types
export const adaptedTools = [
  adaptToolDefinition(dataTool),
  adaptToolDefinition(browserUseTool),
  adaptToolDefinition(canvasTool)
];

// Function to get all available tools
export const getAvailableTools = (): ToolDefinition[] => {
  return [...adaptedTools];
};

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
      message: `Error executing tool: ${errorToString(error)}`,
      error: errorToString(error),
      state: CommandExecutionState.FAILED
    };
  }
};
