import { RunnerContext } from "../runner/types";
import { SDKTool } from "./types";
import { ToolDefinition } from "../types";

export class ToolConverter {
  /**
   * Converts a standard tool definition to SDK format
   */
  static convertToSDKTool(toolDef: ToolDefinition): SDKTool {
    return {
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.parameters,
      execute: async (params: any, context?: any) => {
        try {
          return await toolDef.execute(params, context);
        } catch (error) {
          console.error(`Error executing tool ${toolDef.name}:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
          };
        }
      }
    };
  }

  /**
   * Converts multiple standard tools to SDK format
   */
  static convertMultipleToSDK(tools: ToolDefinition[]): SDKTool[] {
    return tools.map(tool => this.convertToSDKTool(tool));
  }

  /**
   * Safely wraps a tool execution to add error handling and metrics
   */
  static wrapToolExecution(tool: SDKTool): SDKTool {
    const originalExecute = tool.execute;
    
    return {
      ...tool,
      execute: async (params: any, context?: any) => {
        const startTime = Date.now();
        try {
          const result = await originalExecute(params, context);
          const endTime = Date.now();
          
          // Log tool execution time
          console.log(`Tool ${tool.name} executed in ${endTime - startTime}ms`);
          
          return result;
        } catch (error) {
          const endTime = Date.now();
          console.error(`Tool ${tool.name} failed after ${endTime - startTime}ms:`, error);
          
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred during tool execution"
          };
        }
      }
    };
  }
}
