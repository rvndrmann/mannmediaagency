
import { ToolDefinition } from "../types";
import { canvasTool } from "./canvas-tool";
import { canvasProjectTool } from "./default-tools/canvas-project-tool";
import { workflowTool } from "./workflow-tool";
import { productShotTool } from "./product-shot-tool";
import { imageToVideoTool } from "./image-to-video-tool";
import { browserUseTool } from "./browser-use-tool";
import { searchTool } from "./search-tool";
import { weatherTool } from "./weather-tool";

// Register all available tools here for the tool executor
export const availableTools: ToolDefinition[] = [
  canvasTool,
  canvasProjectTool, // New tool for Canvas project management
  workflowTool,
  productShotTool,
  imageToVideoTool,
  browserUseTool,
  searchTool,
  weatherTool
];

// Helper to get tool by name
export function getToolByName(name: string): ToolDefinition | undefined {
  return availableTools.find(tool => tool.name === name);
}

// Get tools by category
export function getToolsByCategory(category: string): ToolDefinition[] {
  return availableTools.filter(tool => tool.metadata?.category === category);
}

// Get all categories
export function getAllToolCategories(): string[] {
  const categories = new Set<string>();
  availableTools.forEach(tool => {
    if (tool.metadata?.category) {
      categories.add(tool.metadata.category);
    }
  });
  return Array.from(categories);
}
