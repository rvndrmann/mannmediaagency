
import { ToolDefinition } from "./types";
import { defaultTools } from "./default-tools";

let toolRegistry: ToolDefinition[] = [];

/**
 * Initializes the tool system by registering default tools
 */
export async function initializeToolSystem(): Promise<void> {
  // Reset the registry
  toolRegistry = [];
  
  // Register default tools
  registerTools(defaultTools);
  
  console.log(`Tool system initialized with ${toolRegistry.length} tools`);
}

/**
 * Register one or more tools with the tool system
 */
export function registerTools(tools: ToolDefinition[]): void {
  tools.forEach(tool => {
    // Check if tool with the same name already exists
    const existingToolIndex = toolRegistry.findIndex(t => t.name === tool.name);
    
    if (existingToolIndex !== -1) {
      // Update existing tool
      toolRegistry[existingToolIndex] = tool;
      console.log(`Updated existing tool: ${tool.name}`);
    } else {
      // Add new tool
      toolRegistry.push(tool);
      console.log(`Registered new tool: ${tool.name}`);
    }
  });
}

/**
 * Get all available tools
 */
export function getAvailableTools(): ToolDefinition[] {
  return [...toolRegistry];
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry.find(tool => tool.name === name);
}

/**
 * Execute a tool by name with the provided parameters and context
 */
export async function executeToolByName(
  name: string, 
  parameters: any, 
  context: Record<string, any>
): Promise<any> {
  const tool = getToolByName(name);
  
  if (!tool) {
    throw new Error(`Tool "${name}" not found`);
  }
  
  return await tool.execute(parameters, context);
}
