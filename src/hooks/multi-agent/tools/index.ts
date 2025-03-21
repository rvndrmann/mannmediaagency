
import { browserUseTool } from "./browser-use-tool";
import { ToolDefinition } from "../types";
import { imageToVideoTool } from "./image-to-video-tool";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { customVideoTool } from "./custom-video-tool";
import { productVideoTool } from "./product-video-tool";

// Register all available tools
const tools: Record<string, ToolDefinition> = {
  [browserUseTool.name]: browserUseTool,
  [imageToVideoTool.name]: imageToVideoTool,
  [productShotV1Tool.name]: productShotV1Tool,
  [productShotV2Tool.name]: productShotV2Tool,
  [customVideoTool.name]: customVideoTool,
  [productVideoTool.name]: productVideoTool
};

export const getAvailableTools = (): ToolDefinition[] => {
  return Object.values(tools);
};

export const getTool = (name: string): ToolDefinition | undefined => {
  return tools[name];
};
