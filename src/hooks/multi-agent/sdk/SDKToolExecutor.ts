
import { RunnerContext, SDKTool } from "../runner/types";

export class SDKToolExecutor {
  /**
   * Execute a tool with context and error handling
   */
  static async executeToolSafely(
    tool: SDKTool, 
    params: any, 
    context?: RunnerContext
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Log execution start
      console.log(`Executing SDK tool ${tool.name} with params:`, params);
      
      // Add to trace if enabled
      if (context && !context.tracingDisabled && context.addMessage) {
        context.addMessage(`Executing tool: ${tool.name}`, "tool_start");
      }
      
      // Execute the tool
      const result = await tool.execute(params, context);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      console.log(`SDK tool ${tool.name} execution completed in ${executionTime}ms`);
      
      // Add result to trace if enabled
      if (context && !context.tracingDisabled && context.addMessage) {
        context.addMessage(
          `Tool ${tool.name} execution result: ${JSON.stringify(result).substring(0, 200)}`,
          "tool_result"
        );
      }
      
      return result;
    } catch (error) {
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      console.error(`SDK tool ${tool.name} execution failed after ${executionTime}ms:`, error);
      
      // Add error to trace if enabled
      if (context && !context.tracingDisabled && context.addMessage) {
        context.addMessage(
          `Tool ${tool.name} execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          "tool_error"
        );
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during tool execution"
      };
    }
  }
  
  /**
   * Find a tool by name in a collection of tools
   */
  static findToolByName(toolName: string, tools: SDKTool[]): SDKTool | undefined {
    return tools.find(tool => tool.name === toolName);
  }
}
