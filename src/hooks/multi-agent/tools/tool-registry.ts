
import { canvasTool } from "./canvas-tool";
import { canvasProjectTool } from "./default-tools/canvas-project-tool";
import { workflowTool } from "./workflow-tool";
import { imageToVideoTool } from "./image-to-video-tool";
import { browserUseTool } from "./browser-use-tool";

// Register all available tools here for the tool executor
export const availableTools = [
  canvasTool,
  canvasProjectTool,
  workflowTool,
  imageToVideoTool,
  browserUseTool
];

// Helper to get tool by name
export function getToolByName(name: string) {
  return availableTools.find((tool) => tool.name === name);
}

// Get tools by category
export function getToolsByCategory(category: string) {
  return availableTools.filter((tool) => tool.metadata?.category === category);
}

// Get all categories
export function getAllToolCategories() {
  const categories = new Set<string>();
  availableTools.forEach((tool) => {
    if (tool.metadata?.category) {
      categories.add(tool.metadata.category);
    }
  });
  return Array.from(categories);
}
