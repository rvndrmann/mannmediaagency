
import { ToolDefinition as MultiAgentToolDefinition, CommandExecutionState, ToolContext } from './types';
import { ToolDefinition as ToolsToolDefinition } from './tools/types';
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
        session: context.session || context.sessionId ? { id: context.sessionId } : null,
        supabase: context.supabase
      };
      
      // Call the original execute function
      const result = await tool.execute(params, adaptedContext);
      
      // Ensure the state is converted to the correct enum value
      let state = result.state;
      if (typeof state === 'string') {
        switch(state) {
          case 'completed': 
            state = CommandExecutionState.COMPLETED;
            break;
          case 'failed': 
            state = CommandExecutionState.FAILED;
            break;
          case 'processing': 
            state = CommandExecutionState.PROCESSING;
            break;
          case 'error': 
            state = CommandExecutionState.ERROR;
            break;
          case 'pending':
            state = CommandExecutionState.PENDING;
            break;
          case 'running':
            state = CommandExecutionState.RUNNING;
            break;
          case 'cancelled':
            state = CommandExecutionState.CANCELLED;
            break;
        }
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
