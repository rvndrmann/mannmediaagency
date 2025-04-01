
import { adaptToolDefinition } from "../tools";
import { canvasTool } from "./canvas-tool";
import { canvasContentTool } from "./canvas-content-tool";
import { dataTool } from "./tool-registry";
import { browserUseTool } from "./tool-registry";
import { productShotV2Tool } from "./product-shot-v2-tool";
import { imageToVideoTool } from "./image-to-video-tool";

/**
 * Initialize and register all tools
 */
export function initializeToolSystem() {
  // Register all available tools
  const availableTools = [
    canvasTool,
    canvasContentTool,
    dataTool,
    browserUseTool,
    productShotV2Tool,
    imageToVideoTool
  ];
  
  console.info(`Tool system initialized with ${availableTools.length} tools`);
  
  return availableTools;
}

// Export all tools for direct access
export {
  canvasTool,
  canvasContentTool,
  dataTool,
  browserUseTool,
  productShotV2Tool,
  imageToVideoTool
};
