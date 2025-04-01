
import { ToolDefinition, ToolContext, ToolExecutionResult } from '../types';
import { browserUseTool } from './browser-use-tool';
import { canvasTool } from './canvas-tool';
import { toast } from 'sonner';

// Track registered tools
export let availableTools: ToolDefinition[] = [];

// Initialize tools and register them
export const initializeToolSystem = async (): Promise<void> => {
  try {
    // Register core tools
    registerTool(browserUseTool);
    registerTool(canvasTool);
    
    // Register more tools here as needed
    
    console.log(`Tool system initialized with ${availableTools.length} tools available`);
  } catch (error) {
    console.error("Error initializing tool system:", error);
    throw error;
  }
};

// Register a tool with the system
export const registerTool = (tool: ToolDefinition): void => {
  // Check if tool with this name already exists
  const existingToolIndex = availableTools.findIndex(t => t.name === tool.name);
  
  if (existingToolIndex >= 0) {
    // Replace existing tool
    availableTools[existingToolIndex] = tool;
    console.log(`Updated existing tool: ${tool.name}`);
  } else {
    // Add new tool
    availableTools.push(tool);
    console.log(`Registered new tool: ${tool.name}`);
  }
};

// Execute a specific tool by name
export const executeTool = async (
  toolName: string,
  parameters: any,
  context: ToolContext
): Promise<ToolExecutionResult> => {
  try {
    const tool = availableTools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    
    console.log(`Executing tool: ${toolName}`, parameters);
    return await tool.execute(parameters, context);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    toast.error(`Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      success: false,
      message: `Failed to execute tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      state: CommandExecutionState.ERROR
    };
  }
};

// Get all available tools
export const getAvailableTools = (): ToolDefinition[] => {
  return [...availableTools];
};
