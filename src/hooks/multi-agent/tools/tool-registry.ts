
import { ToolDefinition } from "../runner/types";

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private static instance: ToolRegistry;

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool with name ${tool.name} already exists. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  public registerTools(tools: ToolDefinition[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getToolsByCategory(category: string): ToolDefinition[] {
    return this.getTools().filter(tool => 
      tool.metadata && tool.metadata.category === category
    );
  }

  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  public clearTools(): void {
    this.tools.clear();
  }

  public hasToolWithName(name: string): boolean {
    return this.tools.has(name);
  }
}

export default ToolRegistry;
