
import { canvasTool } from "./canvas-tool";
import { canvasProjectTool } from "./canvas-project-tool";

export { 
  canvasTool,
  canvasProjectTool
};

// These tools will be automatically registered with the system
export default [
  canvasTool,
  canvasProjectTool
];
