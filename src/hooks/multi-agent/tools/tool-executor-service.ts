
import { CommandExecutionState, ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { getAvailableTools } from "./tool-registry";

export const executeTool = async (toolName: string, parameters: any, context: ToolContext): Promise<any> => {
  // Get all available tools
  const availableTools = getAvailableTools();
  
  // Check if the tool exists
  const tool = availableTools.find(t => t.name === toolName);
  if (!tool) {
    console.warn(`Tool ${toolName} not found`);
    return {
      state: CommandExecutionState.FAILED,
      message: `Tool ${toolName} not found`
    };
  }

  // Check if the tool requires credits and if the user has enough credits
  if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
    return {
      state: CommandExecutionState.FAILED,
      message: `Insufficient credits to use tool ${toolName}. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`
    };
  }

  // Execute the tool
  try {
    const result = await tool.execute(parameters, context);

    // Check if the tool execution was successful
    if (result.success) {
      return {
        state: CommandExecutionState.COMPLETED,
        message: result.message || `Tool ${toolName} executed successfully`,
        data: result.data
      };
    } else {
      return {
        state: CommandExecutionState.FAILED,
        message: result.message || `Tool ${toolName} execution failed`,
        data: result.data
      };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      state: CommandExecutionState.FAILED,
      message: error.message || `Error executing tool ${toolName}`,
      error: error
    };
  }
};

// Tool Executor Service class
export class ToolExecutorService {
  private static instance: ToolExecutorService;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  public static getInstance(): ToolExecutorService {
    if (!ToolExecutorService.instance) {
      ToolExecutorService.instance = new ToolExecutorService();
    }
    return ToolExecutorService.instance;
  }
  
  public async executeTool(
    toolName: string, 
    parameters: any, 
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    return executeTool(toolName, parameters, context);
  }
  
  public getAvailableTools(): ToolDefinition[] {
    return getAvailableTools();
  }
  
  public getToolByName(name: string): ToolDefinition | undefined {
    return getAvailableTools().find(tool => tool.name === name);
  }
}
