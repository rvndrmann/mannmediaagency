
import { RunnerContext, ToolExecutionResult, CommandExecutionState } from "../runner/types";

export class SDKToolExecutor {
  private context: RunnerContext;
  
  constructor(context: RunnerContext) {
    this.context = context;
  }
  
  async executeToolByName(toolName: string, parameters: any): Promise<ToolExecutionResult> {
    console.log(`[SDKToolExecutor] Executing tool: ${toolName}`, parameters);
    
    try {
      if (!this.context.tracingEnabled) {
        console.log("[SDKToolExecutor] Tracing is disabled, tool execution will not be recorded");
      }
      
      // For now, return a mock success result
      return {
        success: true,
        message: `Tool ${toolName} executed successfully (mock)`,
        data: { result: "Mock tool execution result" },
        state: CommandExecutionState.COMPLETED // Add state property
      };
    } catch (error) {
      console.error(`[SDKToolExecutor] Error executing tool ${toolName}:`, error);
      return {
        success: false,
        message: `Failed to execute tool ${toolName}`,
        error: error instanceof Error ? error : new Error(String(error)),
        state: CommandExecutionState.FAILED // Add state property
      };
    }
  }
  
  async validateToolParameters(toolName: string, parameters: any): Promise<boolean> {
    // Simple mock validation
    console.log(`[SDKToolExecutor] Validating parameters for tool: ${toolName}`, parameters);
    
    try {
      if (!this.context.tracingEnabled) {
        console.log("[SDKToolExecutor] Tracing is disabled, validation will not be recorded");
      }
      
      return true;
    } catch (error) {
      console.error(`[SDKToolExecutor] Error validating parameters for tool ${toolName}:`, error);
      return false;
    }
  }
}
