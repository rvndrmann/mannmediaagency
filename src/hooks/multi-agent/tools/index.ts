
import { ToolContext, ToolDefinition, ToolExecutionResult } from "../types";
import { CommandExecutionState } from "../runner/types";
import { canvasTool } from "./canvas-tool";
import { canvasContentTool } from "./canvas-content-tool";
import { sdkCanvasDataTool } from "../sdk/tools/SdkCanvasDataTool";

// Keep track of registered tools
export const availableTools: ToolDefinition[] = [
  canvasTool,
  canvasContentTool
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
    
    // Add SDK tools - make sure it conforms to ToolDefinition interface
    if (sdkCanvasDataTool && 
        typeof sdkCanvasDataTool.name === 'string' && 
        typeof sdkCanvasDataTool.description === 'string' && 
        sdkCanvasDataTool.parameters && 
        typeof sdkCanvasDataTool.parameters.type === 'string' &&
        typeof sdkCanvasDataTool.parameters.properties === 'object') {
      toolMap.set(sdkCanvasDataTool.name, sdkCanvasDataTool as ToolDefinition);
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
        state: CommandExecutionState.ERROR
      };
    }
    
    // Check if user has enough credits (if the tool requires credits)
    if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
      return {
        success: false,
        message: `Insufficient credits to use this tool. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`,
        state: CommandExecutionState.ERROR
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
