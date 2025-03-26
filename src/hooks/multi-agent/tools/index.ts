
import { ToolDefinition } from "../types";
import browserUseTool from "./browser-use-tool";
import productShotV1Tool from "./product-shot-v1-tool";
import imageToVideoTool from "./image-to-video-tool";

// Add more tools as they are implemented
const tools: ToolDefinition[] = [
  {
    ...browserUseTool,
    version: "1.0.0" // Add missing version property
  },
  productShotV1Tool,
  imageToVideoTool
];

export const getTool = (name: string): ToolDefinition | undefined => {
  return tools.find(tool => tool.name === name);
};

export const getAllTools = (): ToolDefinition[] => {
  return [...tools];
};
