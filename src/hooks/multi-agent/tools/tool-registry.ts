
import { ToolDefinition } from "../types";
import { dataTool } from "./data-tool";
import { webSearchTool } from "./web-search-tool";
import { canvasTool } from "./default-tools/canvas-tool";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { browserUseTool } from "./browser-use-tool";
import { imageToVideoTool } from "./image-to-video-tool";

// Define all available tools
const allTools: ToolDefinition[] = [
  dataTool,
  webSearchTool,
  canvasTool,
  productShotV1Tool,
  productShotV2Tool,
  browserUseTool,
  imageToVideoTool
];

// Get all available tools
export const getAvailableTools = (): ToolDefinition[] => {
  return allTools;
};

// Get tools by category
export const getToolsByCategory = (category: string): ToolDefinition[] => {
  return allTools.filter(tool => 
    tool.metadata && tool.metadata.category === category
  );
};

// Get tool by name
export const getToolByName = (name: string): ToolDefinition | undefined => {
  return allTools.find(tool => tool.name === name);
};
