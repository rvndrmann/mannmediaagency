
import { ToolDefinition } from "./types";
import { availableTools } from "./tools/index";

export function getTool(name: string): ToolDefinition | undefined {
  return availableTools.find(tool => tool.name === name);
}

export function getAvailableTools(): ToolDefinition[] {
  return availableTools;
}
