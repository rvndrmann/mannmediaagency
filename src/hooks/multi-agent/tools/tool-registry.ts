
import { ToolDefinition } from "../types";
import { CommandExecutionState } from "../types";
import { dataTool } from "./data-tool";
import { executeDataTool } from "./data-tool";
import { canvasTool } from "./canvas-tool";
import { canvasContentTool } from "./canvas-content-tool";
import { browserUseTool } from "./browser-use-tool";

// Register all available tools
export const availableTools: ToolDefinition[] = [
  dataTool,
  canvasTool,
  canvasContentTool,
  browserUseTool
];

// Re-export for use elsewhere
export { dataTool, canvasTool, canvasContentTool, browserUseTool };
