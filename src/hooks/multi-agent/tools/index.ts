
import { ToolDefinition } from "../types";
import { browserUseTool } from "./browser-use-tool";
import { productShotV1Tool } from "./product-shot-v1-tool";
import { imageToVideoTool } from "./image-to-video-tool";

// Add more tools as they are implemented
const tools: ToolDefinition[] = [
  browserUseTool,   // Version is now properly defined in the tool definition
  productShotV1Tool, // Version is now properly defined in the tool definition
  imageToVideoTool   // Version is now properly defined in the tool definition
];

export const getTool = (name: string): ToolDefinition | undefined => {
  return tools.find(tool => tool.name === name);
};

export const getAllTools = (): ToolDefinition[] => {
  return [...tools];
};
