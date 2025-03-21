
import { ToolDefinition } from "./types";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { imageToVideoTool } from "./image-to-video-tool";
import { browserUseTool } from "./browser-use-tool";
import { productVideoTool } from "./product-video-tool";
import { customVideoTool } from "./custom-video-tool";

// Registry of all available tools
const toolRegistry: Record<string, ToolDefinition> = {
  "product-shot-v1": productShotV1Tool,
  "product-shot-v2": productShotV2Tool,
  "image-to-video": imageToVideoTool,
  "browser-use": browserUseTool,
  "product-video": productVideoTool,
  "custom-video": customVideoTool,
};

// Export the tool registry
export const getAvailableTools = (): ToolDefinition[] => {
  return Object.values(toolRegistry);
};

// Get a specific tool by name
export const getTool = (name: string): ToolDefinition | undefined => {
  return toolRegistry[name];
};

// Format tools for the LLM to understand
export const getToolsForLLM = (): any[] => {
  return Object.values(toolRegistry).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    required_credits: tool.requiredCredits
  }));
};
