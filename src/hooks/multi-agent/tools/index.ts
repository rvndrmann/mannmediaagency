
import { ToolDefinition } from "../types";

// This is a registry for tool definitions
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
