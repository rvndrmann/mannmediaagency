
import { ToolDefinition } from "../runner/types";
import ToolRegistry from "./tool-registry";
import { ToolExecutorService } from "./tool-executor-service";
import { defaultTools } from "./default-tools";

// Initialize the tool system
export function initializeToolSystem(): void {
  const registry = ToolRegistry.getInstance();
  const executor = ToolExecutorService.getInstance();
  
  // Register all default tools
  registry.registerTools(defaultTools);
  
  console.log(`Tool system initialized with ${defaultTools.length} default tools`);
}

// Get all available tools
export function getAvailableTools(): ToolDefinition[] {
  return ToolRegistry.getInstance().getTools();
}

// Get a specific tool by name
export function getTool(name: string): ToolDefinition | undefined {
  return ToolRegistry.getInstance().getTool(name);
}

// Register a new tool
export function registerTool(tool: ToolDefinition): void {
  ToolRegistry.getInstance().registerTool(tool);
}

// Execute a tool
export async function executeTool(
  toolName: string, 
  parameters: Record<string, any>,
  context: any
): Promise<any> {
  return ToolExecutorService.getInstance().executeTool(toolName, parameters, context);
}

// Default export to initialize the tool system
export default {
  initializeToolSystem,
  getAvailableTools,
  getTool,
  registerTool,
  executeTool
};
