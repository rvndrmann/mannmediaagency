import { ToolExecutorService } from "./tool-executor-service";
import ToolRegistry from "./tool-registry";
import { CommandExecutionState, ToolContext, ToolDefinition } from "../types";
import { canvasTool } from "./canvas-tool";

// Other default tools will be imported and added here
import { RunnerContext } from "../runner/types";

// Singleton instances
let toolRegistry: ToolRegistry | null = null;
let toolExecutorService: ToolExecutorService | null = null;

/**
 * Initialize the tool system
 */
export function initializeToolSystem(): void {
  // Create/get tool registry
  toolRegistry = ToolRegistry.getInstance();
  
  // Create/get tool executor
  toolExecutorService = ToolExecutorService.getInstance();
  
  // Register default tools
  registerDefaultTools();
}

/**
 * Register default tools
 */
function registerDefaultTools(): void {
  if (!toolRegistry) return;
  
  const defaultTools: ToolDefinition[] = [
    {
      name: canvasTool.name,
      description: canvasTool.description,
      version: canvasTool.version || "1.0",
      requiredCredits: canvasTool.requiredCredits || 0,
      execute: canvasTool.execute,
      parameters: canvasTool.parameters,
      metadata: {
        category: "canvas",
        displayName: "Canvas Tool",
        icon: "layers"
      }
    }
  ];
  
  toolRegistry.registerTools(defaultTools);
}

/**
 * Get available tools
 */
export function getAvailableTools(): ToolDefinition[] {
  if (!toolRegistry) {
    toolRegistry = ToolRegistry.getInstance();
  }
  return toolRegistry.getTools();
}

/**
 * Get available tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  if (!toolRegistry) {
    toolRegistry = ToolRegistry.getInstance();
  }
  return toolRegistry.getToolsByCategory(category);
}

/**
 * Get a tool by name
 */
export function getTool(toolName: string): ToolDefinition | undefined {
  if (!toolRegistry) {
    toolRegistry = ToolRegistry.getInstance();
  }
  return toolRegistry.getTool(toolName);
}

/**
 * Execute a tool
 */
export async function executeTool(
  toolName: string,
  parameters: Record<string, any>,
  context: RunnerContext
): Promise<{
  state: CommandExecutionState;
  message: string;
  data?: any;
  error?: string;
}> {
  if (!toolExecutorService) {
    toolExecutorService = ToolExecutorService.getInstance();
  }
  
  try {
    const result = await toolExecutorService.executeTool(toolName, parameters, context);
    
    return {
      state: result.state || CommandExecutionState.COMPLETED,
      message: result.message || "Tool executed successfully",
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      state: CommandExecutionState.FAILED,
      message: `Failed to execute tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Register a new tool
 */
export function registerTool(tool: ToolDefinition): void {
  if (!toolRegistry) {
    toolRegistry = ToolRegistry.getInstance();
  }
  toolRegistry.registerTool(tool);
}

/**
 * Register multiple tools
 */
export function registerTools(tools: ToolDefinition[]): void {
  if (!toolRegistry) {
    toolRegistry = ToolRegistry.getInstance();
  }
  toolRegistry.registerTools(tools);
}
