
import { ToolDefinition } from "../types";
import { canvasTool } from "../canvas-tool";
import { json2videoTool } from "../json2video-tool";

export const defaultTools: ToolDefinition[] = [
  canvasTool,
  json2videoTool
];
