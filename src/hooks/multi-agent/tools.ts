
import { ToolDefinition as MultiAgentToolDefinition } from './types';
import { ToolDefinition as ToolsToolDefinition, CommandExecutionState } from './tools/types';
import { canvasTool } from './tools/canvas-tool';
import { canvasContentTool } from './tools/canvas-content-tool';
import { dataTool } from './tools/tool-registry';
import { browserUseTool } from './tools/tool-registry';
import { productShotV2Tool } from './tools/product-shot-v2-tool';
import { imageToVideoTool } from './tools/image-to-video-tool';

// This function adapts a tool from the tools/types.ts format to types.ts format
export function adaptToolDefinition(tool: ToolsToolDefinition): MultiAgentToolDefinition {
  return {
    ...tool,
    execute: async (params, context) => {
      // Adapt the context for the original execute function
      const adaptedContext = {
        ...context,
        // Add missing properties that the original execute might expect
        user: context.user || null,
        session: context.session || null,
        supabase: context.supabase
      };
      
      // Call the original execute function
      const result = await tool.execute(params, adaptedContext);
      
      // Convert the state enum if needed
      let state = result.state;
      if (typeof state === 'string') {
        if (state === 'completed') state = CommandExecutionState.COMPLETED;
        if (state === 'failed') state = CommandExecutionState.FAILED;
        if (state === 'processing') state = CommandExecutionState.PROCESSING;
        if (state === 'error') state = CommandExecutionState.ERROR;
      }
      
      // Return an adapted result
      return {
        ...result,
        state
      };
    }
  };
}

// Export adapted tools
export const adaptedCanvasTool = adaptToolDefinition(canvasTool);
export const adaptedCanvasContentTool = adaptToolDefinition(canvasContentTool);
export const adaptedDataTool = adaptToolDefinition(dataTool);
export const adaptedBrowserUseTool = adaptToolDefinition(browserUseTool);
export const adaptedProductShotV2Tool = adaptToolDefinition(productShotV2Tool);
export const adaptedImageToVideoTool = adaptToolDefinition(imageToVideoTool);

// Create a list of adapted tools
export const adaptedTools = [
  adaptedCanvasTool,
  adaptedCanvasContentTool,
  adaptedDataTool,
  adaptedBrowserUseTool,
  adaptedProductShotV2Tool,
  adaptedImageToVideoTool
];

// Function to get all available tools
export const getAvailableTools = (): MultiAgentToolDefinition[] => {
  return [...adaptedTools];
};
