
import { SDKTool } from "./types";
import { ToolExecutionResult, CommandExecutionState } from "../runner/types";

export class SDKToolExecutor {
  private tool: SDKTool;
  
  constructor(tool: SDKTool) {
    this.tool = tool;
  }
  
  async execute(parameters: any, context: any): Promise<ToolExecutionResult> {
    try {
      const result = await this.tool.execute(parameters, context);
      
      return {
        success: true,
        message: typeof result === 'object' ? JSON.stringify(result) : String(result),
        data: result,
        state: CommandExecutionState.COMPLETED,
        usage: {
          creditsUsed: 1 // Default credit usage
        }
      };
    } catch (error) {
      console.error(`Error executing tool ${this.tool.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.ERROR,
        data: null,
        usage: {
          creditsUsed: 0 // No credits used on error
        }
      };
    }
  }
}
