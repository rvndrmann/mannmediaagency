
import { CommandExecutionState, ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { availableTools } from "./tool-registry";

export const executeTool = async (toolName: string, parameters: any, context: ToolContext): Promise<ToolExecutionResult> => {
  // Get all available tools
  const tools = availableTools;
  
  // Check if the tool exists
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    console.warn(`Tool ${toolName} not found`);
    return {
      state: CommandExecutionState.FAILED,
      message: `Tool ${toolName} not found`,
      success: false
    };
  }

  // Check if the tool requires credits and if the user has enough credits
  if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
    return {
      state: CommandExecutionState.FAILED,
      message: `Insufficient credits to use tool ${toolName}. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`,
      success: false
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
        data: result.data,
        success: true
      };
    } else {
      return {
        state: CommandExecutionState.FAILED,
        message: result.message || `Tool ${toolName} execution failed`,
        data: result.data,
        success: false
      };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      state: CommandExecutionState.FAILED,
      message: error.message || `Error executing tool ${toolName}`,
      error: error.message,
      success: false
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
    return availableTools;
  }
  
  public getToolByName(name: string): ToolDefinition | undefined {
    return availableTools.find(tool => tool.name === name);
  }
}
