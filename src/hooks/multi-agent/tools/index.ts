import { ToolContext, ToolDefinition, ToolExecutionResult } from "../types";
import { CommandExecutionState } from "../runner/types";
import { canvasTool } from "./canvas-tool";
import { canvasContentTool } from "./canvas-content-tool";
import { dataTool } from "./data-tool";
import { browserUseTool } from "./browser-use-tool";
import { webSearchTool } from "./web-search-tool";
import { sdkCanvasDataTool } from "../sdk/tools/SdkCanvasDataTool";

// Register all available tools
export const availableTools: ToolDefinition[] = [
  dataTool,
  canvasTool,
  canvasContentTool,
  browserUseTool,
  webSearchTool
];

// Map to quickly look up tools by name
const toolMap: Map<string, ToolDefinition> = new Map();

// Initialize the tool system
export const initializeToolSystem = async (): Promise<boolean> => {
  try {
    // Reset the tool map
    toolMap.clear();
    
    // Add all tools to the map
    for (const tool of availableTools) {
      toolMap.set(tool.name, tool);
    }
    
    // Add SDK tools if they conform to our interface or can be adapted
    if (sdkCanvasDataTool) {
      // Check if it's already in the proper format
      if (typeof sdkCanvasDataTool.name === 'string' && 
          typeof sdkCanvasDataTool.description === 'string' && 
          sdkCanvasDataTool.parameters && 
          typeof sdkCanvasDataTool.parameters.type === 'string' &&
          typeof sdkCanvasDataTool.parameters.properties === 'object') {
        toolMap.set(sdkCanvasDataTool.name, sdkCanvasDataTool as ToolDefinition);
      } 
      // Otherwise, adapt it to our format
      else if (typeof sdkCanvasDataTool.name === 'string') {
        // Create an adapter that conforms to our ToolDefinition interface
        const adaptedTool: ToolDefinition = {
          name: sdkCanvasDataTool.name,
          description: sdkCanvasDataTool.description || `SDK Tool: ${sdkCanvasDataTool.name}`,
          parameters: {
            type: 'object',
            properties: sdkCanvasDataTool.parameters || {}
          },
          execute: async (parameters, context) => {
            try {
              // Call the SDK tool's execute method
              if (typeof sdkCanvasDataTool.execute === 'function') {
                const result = await sdkCanvasDataTool.execute(parameters, context);
                return {
                  success: result.success || false,
                  message: result.message || 'SDK tool execution complete',
                  state: result.state || (result.success ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED),
                  data: result.data
                };
              } else {
                return {
                  success: false,
                  message: 'SDK tool has no execute method',
                  state: CommandExecutionState.FAILED
                };
              }
            } catch (error) {
              console.error(`Error executing SDK tool "${sdkCanvasDataTool.name}":`, error);
              return {
                success: false,
                message: error instanceof Error ? error.message : `Unknown error executing SDK tool "${sdkCanvasDataTool.name}"`,
                state: CommandExecutionState.ERROR
              };
            }
          }
        };
        
        toolMap.set(adaptedTool.name, adaptedTool);
      }
    }
    
    console.log(`Tool system initialized with ${toolMap.size} tools`);
    return true;
  } catch (error) {
    console.error("Error initializing tool system:", error);
    return false;
  }
};

// Get all available tools
export const getAvailableTools = (): ToolDefinition[] => {
  return [...toolMap.values()];
};

// Execute a tool by name
export const executeTool = async (
  toolName: string, 
  parameters: any, 
  context: ToolContext
): Promise<ToolExecutionResult> => {
  try {
    // Check if the tool exists
    const tool = toolMap.get(toolName);
    if (!tool) {
      return {
        success: false,
        message: `Tool "${toolName}" not found`,
        state: CommandExecutionState.FAILED
      };
    }
    
    // Check if user has enough credits (if the tool requires credits)
    if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
      return {
        success: false,
        message: `Insufficient credits to use this tool. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`,
        state: CommandExecutionState.FAILED
      };
    }
    
    // Execute the tool
    console.log(`Executing tool "${toolName}" with parameters:`, parameters);
    const result = await tool.execute(parameters, context);
    
    // Add state to the result if not present
    if (!result.state) {
      result.state = result.success ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED;
    }
    
    return result;
  } catch (error) {
    console.error(`Error executing tool "${toolName}":`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : `Unknown error executing tool "${toolName}"`,
      state: CommandExecutionState.ERROR
    };
  }
};

// Register a new tool
export const registerTool = (tool: ToolDefinition): boolean => {
  try {
    // Check if the tool already exists
    if (toolMap.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    
    // Add the tool to the map
    toolMap.set(tool.name, tool);
    
    // Add to available tools array if not already there
    if (!availableTools.some(t => t.name === tool.name)) {
      availableTools.push(tool);
    }
    
    return true;
  } catch (error) {
    console.error(`Error registering tool "${tool.name}":`, error);
    return false;
  }
};
