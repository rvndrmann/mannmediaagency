
import { Tool, ToolDefinition } from "../types";

// This is a placeholder that will be populated with actual tools later
const tools: Record<string, ToolDefinition> = {};

/**
 * Register a tool in the system
 */
export function registerTool(tool: ToolDefinition): void {
  tools[tool.name] = tool;
}

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return tools[name];
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(tools);
}
