
import { canvasTool } from "./canvas-tool";
import { canvasContentTool } from "./canvas-content-tool";
import { webSearchTool } from "./web-search-tool";
import { dataTool } from "./data-tool";
import { imageGenerationTool } from "./image-generation-tool";

// Export all available tools
export const availableTools = [
  canvasTool,
  canvasContentTool,
  webSearchTool,
  dataTool,
  imageGenerationTool
];

// Function to get a tool by name
export function getToolByName(name: string) {
  return availableTools.find(tool => tool.name === name);
}

// Export specific tools for direct import
export {
  canvasTool,
  canvasContentTool,
  webSearchTool,
  dataTool,
  imageGenerationTool
};
