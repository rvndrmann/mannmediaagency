
import { ToolContext, ToolDefinition } from "./types";
import { getAvailableTools } from "./tool-registry";

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
  ) {
    const tool = this.availableTools.find(tool => tool.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }
    
    try {
      return await tool.execute(parameters, context);
    } catch (error) {
      console.error(`Error executing tool "${toolName}":`, error);
      throw error;
    }
  }

  public getToolDefinitionByName(toolName: string): ToolDefinition | undefined {
    return this.availableTools.find(tool => tool.name === toolName);
  }

  public getAvailableTools(): ToolDefinition[] {
    return this.availableTools;
  }
}
