
import { RunnerContext, ToolDefinition } from "../runner/types";
import { CommandExecutionState } from "../types";
import ToolRegistry from "./tool-registry";

export interface ToolExecutionResult {
  state: CommandExecutionState;
  message: string;
  data?: any;
  error?: string;
  usage?: {
    creditsUsed: number;
  };
}

export class ToolExecutorService {
  private static instance: ToolExecutorService;
  private registry: ToolRegistry;

  private constructor() {
    this.registry = ToolRegistry.getInstance();
  }

  public static getInstance(): ToolExecutorService {
    if (!ToolExecutorService.instance) {
      ToolExecutorService.instance = new ToolExecutorService();
    }
    return ToolExecutorService.instance;
  }

  public async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context: RunnerContext
  ): Promise<ToolExecutionResult> {
    try {
      const tool = this.registry.getTool(toolName);
      
      if (!tool) {
        return {
          state: CommandExecutionState.FAILED,
          message: `Tool "${toolName}" not found.`,
          error: `Unknown tool: ${toolName}`
        };
      }

      // Check if there are enough credits
      if (
        typeof tool.requiredCredits === 'number' && 
        tool.requiredCredits > 0 &&
        context.creditsRemaining !== undefined &&
        context.creditsRemaining < tool.requiredCredits
      ) {
        return {
          state: CommandExecutionState.FAILED,
          message: `Insufficient credits to execute tool "${toolName}". Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining || 0}`,
          error: 'Insufficient credits'
        };
      }

      // Execute the tool with the provided parameters and context
      const result = await tool.execute(parameters, context);

      // Check if the execution was successful
      if (!result.success) {
        return {
          state: CommandExecutionState.FAILED,
          message: `Tool execution failed: ${result.message || result.error || "Unknown error"}`,
          error: result.error || 'Execution failed',
          data: result.data
        };
      }

      // Return the successful result
      return {
        state: CommandExecutionState.COMPLETED,
        message: result.message || "Tool execution completed successfully",
        data: result.data,
        usage: result.usage
      };
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        state: CommandExecutionState.FAILED,
        message: `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public getAvailableTools(): ToolDefinition[] {
    return this.registry.getTools();
  }

  public registerTool(tool: ToolDefinition): void {
    this.registry.registerTool(tool);
  }

  public registerTools(tools: ToolDefinition[]): void {
    this.registry.registerTools(tools);
  }
}
