
import { useState, useCallback } from 'react';
import { ToolContext, ToolDefinition, CommandExecutionState, ToolResult } from "./tools/types";
import { getAvailableTools } from "./tools";

export class ToolExecutorService {
  private static instance: ToolExecutorService;
  private availableTools: ToolDefinition[];

  private constructor() {
    this.availableTools = getAvailableTools();
  }

  public static getInstance(): ToolExecutorService {
    if (!ToolExecutorService.instance) {
      ToolExecutorService.instance = new ToolExecutorService();
    }
    return ToolExecutorService.instance;
  }

  public async executeToolByName(
    toolName: string,
    parameters: any,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.availableTools.find(tool => tool.name === toolName);
    
    if (!tool) {
      return {
        success: false,
        message: `Tool "${toolName}" not found`,
        state: CommandExecutionState.ERROR,
        data: null
      };
    }
    
    try {
      return await tool.execute(parameters, context);
    } catch (error) {
      console.error(`Error executing tool "${toolName}":`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.ERROR,
        data: null
      };
    }
  }

  public getToolDefinitionByName(toolName: string): ToolDefinition | undefined {
    return this.availableTools.find(tool => tool.name === toolName);
  }

  public getAvailableTools(): ToolDefinition[] {
    return this.availableTools;
  }
}

export const useToolExecutor = () => {
  const [executionState, setExecutionState] = useState<Record<string, {
    inProgress: boolean;
    hasError: boolean;
    result?: any;
    error?: Error;
  }>>({});
  
  const toolExecutor = ToolExecutorService.getInstance();
  
  const executeToolByName = useCallback(
    async (toolName: string, parameters: any, context: ToolContext) => {
      const executionId = `${toolName}-${Date.now()}`;
      
      try {
        setExecutionState(prev => ({
          ...prev,
          [executionId]: {
            inProgress: true,
            hasError: false
          }
        }));
        
        const result = await toolExecutor.executeToolByName(toolName, parameters, context);
        
        setExecutionState(prev => ({
          ...prev,
          [executionId]: {
            inProgress: false,
            hasError: !result.success,
            result: result.data
          }
        }));
        
        return result;
      } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error);
        
        setExecutionState(prev => ({
          ...prev,
          [executionId]: {
            inProgress: false,
            hasError: true,
            error: error instanceof Error ? error : new Error(String(error))
          }
        }));
        
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
          state: CommandExecutionState.ERROR,
          data: null
        };
      }
    },
    [toolExecutor]
  );
  
  return {
    executeToolByName,
    executionState,
    getAvailableTools: toolExecutor.getAvailableTools.bind(toolExecutor)
  };
};
