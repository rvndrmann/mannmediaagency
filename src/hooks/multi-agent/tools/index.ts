
// Basic tools utility to support the agent architecture

import { ToolDefinition } from "../types";

export interface Tool extends ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  execute: (params: any) => Promise<any>;
}

const tools: Record<string, Tool> = {
  // This is just a placeholder for now
};

export function getTool(name: string): Tool | null {
  return tools[name] || null;
}

export function registerTool(tool: Tool): void {
  tools[tool.name] = tool;
}

export function getAvailableTools(): Tool[] {
  return Object.values(tools);
}
