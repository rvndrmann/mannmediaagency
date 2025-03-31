
import { ToolDefinition } from "./types";
import * as ToolsModule from "./tools/index";

export function getAvailableTools(): ToolDefinition[] {
  return ToolsModule.getAvailableTools();
}

export function getTool(name: string): ToolDefinition | undefined {
  const allTools = getAvailableTools();
  return allTools.find(tool => tool.name === name);
}

// Export initializeToolSystem from the tools/index.ts module
export const initializeToolSystem = ToolsModule.initializeToolSystem;
