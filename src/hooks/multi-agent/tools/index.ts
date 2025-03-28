
// Basic tools utility to support the agent architecture

import { ToolDefinition } from "../types";
import { browserUseTool } from "./browser-use-tool";
import { imageToVideoTool } from "./image-to-video-tool";

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  execute: (params: any) => Promise<any>;
  version: string;
}

const tools: Record<string, Tool> = {
  // Register the browser-use tool
  "browser-use": browserUseTool as unknown as Tool,
  // Register the image-to-video tool
  "image-to-video": imageToVideoTool as unknown as Tool
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
