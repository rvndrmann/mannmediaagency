
import { CommandExecutionState as MultiAgentCommandExecutionState, ToolContext, ToolExecutionResult as MultiAgentToolExecutionResult } from './types';
import { ToolDefinition as ToolsToolDefinition, CommandExecutionState as ToolsCommandExecutionState, ToolContext as ToolsToolContext, ToolExecutionResult as ToolsToolExecutionResult } from './tools/types';
import { canvasTool } from './tools/canvas-tool';
import { canvasContentTool } from './tools/canvas-content-tool';
import { dataTool, browserUseTool } from './tools/tool-registry';
import { productShotV2Tool } from './tools/product-shot-v2-tool';
import { imageToVideoTool } from './tools/image-to-video-tool';

// This function adapts a tool from the tools/types.ts format to types.ts format
export function adaptToolDefinition(tool: ToolsToolDefinition): any {
  return {
    ...tool,
    execute: async (params: any, context: ToolContext) => {
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
      
      // Map the state to the correct enum value if needed
      let state = result.state;
      if (typeof state === 'string') {
        switch(state) {
          case 'completed': 
            state = ToolsCommandExecutionState.COMPLETED;
            break;
          case 'failed': 
            state = ToolsCommandExecutionState.FAILED;
            break;
          case 'processing': 
            state = ToolsCommandExecutionState.PROCESSING;
            break;
          case 'error': 
            state = ToolsCommandExecutionState.ERROR;
            break;
          case 'pending':
            state = ToolsCommandExecutionState.PENDING;
            break;
          case 'running':
            state = ToolsCommandExecutionState.RUNNING;
            break;
          case 'cancelled':
            state = ToolsCommandExecutionState.CANCELLED;
            break;
        }
      }
      
      // Convert Error objects to strings for compatibility
      let errorValue = result.error || null;
      if (errorValue && typeof errorValue === 'object' && 'message' in errorValue) {
        errorValue = errorValue.message;
      }
      
      // Return an adapted result
      return {
        ...result,
        error: errorValue,
        state
      };
    }
  };
}

// Export adapted tools
// Using type casting to address TypeScript errors while preserving functionality
export const adaptedCanvasTool = adaptToolDefinition(canvasTool) as unknown as ToolsToolDefinition;
export const adaptedCanvasContentTool = adaptToolDefinition(canvasContentTool) as unknown as ToolsToolDefinition;
export const adaptedDataTool = adaptToolDefinition(dataTool) as unknown as ToolsToolDefinition;
export const adaptedBrowserUseTool = adaptToolDefinition(browserUseTool) as unknown as ToolsToolDefinition;
export const adaptedProductShotV2Tool = adaptToolDefinition(productShotV2Tool) as unknown as ToolsToolDefinition;
export const adaptedImageToVideoTool = adaptToolDefinition(imageToVideoTool) as unknown as ToolsToolDefinition;

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
export const getAvailableTools = (): any[] => {
  return [...adaptedTools];
};

// Add executeTool function for compatibility
export const executeTool = async (toolName: string, parameters: any, context: ToolContext) => {
  const tool = adaptedTools.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found`);
  }
  
  return await tool.execute(parameters, context);
};
