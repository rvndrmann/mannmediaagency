
// Import tools
import { canvasContentTool } from "./canvas-content-tool";
import { canvasTool } from "./canvas-tool";
import { canvasDataTool } from "./canvas-data-tool"; // New data tool

// Export all available tools
export const availableTools = [
  canvasContentTool,
  canvasTool,
  canvasDataTool // Add new tool to available tools
];
