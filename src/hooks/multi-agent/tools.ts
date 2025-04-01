
import { CommandExecutionState as MultiAgentCommandExecutionState, ToolContext, ToolExecutionResult as MultiAgentToolExecutionResult } from './types';
import { ToolDefinition as ToolsToolDefinition, CommandExecutionState as ToolsCommandExecutionState, ToolContext as ToolsToolContext, ToolExecutionResult as ToolsToolExecutionResult } from './tools/types';
import { canvasTool } from './tools/canvas-tool';
import { canvasContentTool } from './tools/canvas-content-tool';
import { dataTool, browserUseTool } from './tools/tool-registry';
import { productShotV2Tool } from './tools/product-shot-v2-tool';
import { imageToVideoTool } from './tools/image-to-video-tool';
import { UnifiedCommandExecutionState, UnifiedToolContext, UnifiedToolExecutionResult, errorToString, toToolsExecutionState } from './common-types';

// This function adapts a tool from the tools/types.ts format to types.ts format
export function adaptToolDefinition(tool: ToolsToolDefinition): any {
  return {
    ...tool,
    execute: async (params: any, context: ToolContext) => {
      // Adapt the context for the original execute function
      const adaptedContext: UnifiedToolContext = {
        ...context,
        // Add missing properties that the original execute might expect
        user: context.user || null,
        session: context.session || context.sessionId ? { id: context.sessionId } : null,
        supabase: context.supabase
      };
      
      try {
        // Call the original execute function
        const result = await tool.execute(params, adaptedContext as any);
        
        // Map the state to the correct enum value if needed
        let mappedState: ToolsCommandExecutionState;
        if (typeof result.state === 'string') {
          const unifiedState = UnifiedCommandExecutionState[result.state.toUpperCase() as keyof typeof UnifiedCommandExecutionState] || UnifiedCommandExecutionState.FAILED;
          mappedState = toToolsExecutionState(unifiedState);
        } else {
          mappedState = result.state;
        }
        
        // Convert Error objects to strings for compatibility
        const errorValue = result.error ? errorToString(result.error) : "";
        
        // Return an adapted result
        return {
          ...result,
          error: errorValue,
          state: mappedState
        };
      } catch (error) {
        // Handle any errors from tool execution
        console.error(`Error executing tool ${tool.name}:`, error);
        const errorStr = errorToString(error);
        return {
          success: false,
          message: `Error executing tool ${tool.name}: ${errorStr}`,
          error: errorStr,
          state: ToolsCommandExecutionState.FAILED
        };
      }
    }
  };
}

// Type assertion to help TypeScript understand these adaptations
type AdaptedTool = ReturnType<typeof adaptToolDefinition>;

// Export adapted tools - using type assertion to ensure compatibility
export const adaptedCanvasTool = adaptToolDefinition(canvasTool) as unknown as AdaptedTool;
export const adaptedCanvasContentTool = adaptToolDefinition(canvasContentTool) as unknown as AdaptedTool;
export const adaptedDataTool = adaptToolDefinition(dataTool) as unknown as AdaptedTool;
export const adaptedBrowserUseTool = adaptToolDefinition(browserUseTool) as unknown as AdaptedTool;
export const adaptedProductShotV2Tool = adaptToolDefinition(productShotV2Tool) as unknown as AdaptedTool;
export const adaptedImageToVideoTool = adaptToolDefinition(imageToVideoTool) as unknown as AdaptedTool;

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
export const getAvailableTools = (): AdaptedTool[] => {
  return [...adaptedTools];
};

// Add executeTool function for compatibility
export const executeTool = async (toolName: string, parameters: any, context: ToolContext): Promise<UnifiedToolExecutionResult> => {
  try {
    const tool = adaptedTools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }
    
    const result = await tool.execute(parameters, context as any);
    
    return {
      ...result,
      state: result.state || UnifiedCommandExecutionState.COMPLETED
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute tool "${toolName}": ${errorToString(error)}`,
      error: errorToString(error),
      state: UnifiedCommandExecutionState.FAILED
    };
  }
};
