
// Export all tools and related utilities
import { getAvailableTools, getToolsByCategory, getToolByName } from "./tool-registry";
import { executeTool, ToolExecutorService } from "./tool-executor-service";
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";

// Export the dataTool
import { dataTool } from "./data-tool";
import { webSearchTool } from "./web-search-tool";
import { canvasTool } from "./default-tools/canvas-tool";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { browserUseTool } from "./browser-use-tool";
import { imageToVideoTool } from "./image-to-video-tool";

// Export all tools and utilities
export {
  // Tools registry and utilities
  getAvailableTools,
  getToolsByCategory,
  getToolByName,
  executeTool,
  ToolExecutorService,
  
  // Tool types
  ToolDefinition,
  ToolContext,
  ToolExecutionResult,
  
  // Individual tools
  dataTool,
  webSearchTool,
  canvasTool,
  productShotV1Tool,
  productShotV2Tool,
  browserUseTool,
  imageToVideoTool
};

// Export default tools collection
export const availableTools = [
  dataTool,
  webSearchTool,
  canvasTool,
  productShotV1Tool,
  productShotV2Tool,
  browserUseTool,
  imageToVideoTool
];
