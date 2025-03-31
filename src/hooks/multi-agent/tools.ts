
import { ToolDefinition } from "./types";
import * as ToolsModule from "./tools/index";

export function getAvailableTools(): ToolDefinition[] {
  return ToolsModule.getAvailableTools();
}

export function getTool(name: string): ToolDefinition | undefined {
  return ToolsModule.getTool(name);
}
