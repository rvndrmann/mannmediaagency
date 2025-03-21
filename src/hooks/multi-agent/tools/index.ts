import { Tool } from "../types";

// This is a placeholder that will be populated with actual tools later
const tools: Record<string, Tool> = {};

/**
 * Register a tool in the system
 */
export function registerTool(tool: Tool): void {
  tools[tool.name] = tool;
}

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return tools[name];
}

/**
 * Get all available tools
 */
export function getAllTools(): Tool[] {
  return Object.values(tools);
}
