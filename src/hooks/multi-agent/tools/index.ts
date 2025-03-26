
import { ToolDefinition } from "@/hooks/types";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { imageToVideoTool } from "./image-to-video-tool";
import { executeBrowserUseTool } from "./browser-use-tool";
import { productVideoTool } from "./product-video-tool";
import { customVideoTool } from "./custom-video-tool";
import { ToolContext } from "../types";

// Define the browserUseTool correctly with the right execute signature
export const browserUseTool: ToolDefinition = {
  name: "browser-use",
  description: "Browse the web to perform tasks using an automated browser",
  execute: async (params: Record<string, any>, context: ToolContext) => {
    // Call the executeBrowserUseTool but adapt the result to match ToolDefinition's expected return type
    const result = await executeBrowserUseTool(params, context);
    return {
      success: result.success,
      message: result.message || (result.error || "Unknown error"),
      data: result.data
    };
  },
  parameters: {
    task: {
      type: "string",
      description: "The task to perform using the browser"
    },
    save_browser_data: {
      type: "boolean",
      description: "Whether to save browser data (cookies, etc.)",
      default: true
    }
  },
  requiredCredits: 1
};

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
