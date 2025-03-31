
import { ToolContext, ToolExecutionResult, CommandExecutionState } from "../types";

// Define tool interfaces
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  requiredCredits?: number;
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>;
}

// Placeholder array of available tools - will be populated by the tool registry
export const availableTools: ToolDefinition[] = [];

// Function to initialize the tool system
export function initializeToolSystem() {
  console.log("Tool system initialized with", availableTools.length, "tools");
}

// Function to get all available tools
export function getAvailableTools(): ToolDefinition[] {
  return availableTools;
}

// Function to add a tool to the registry
export function registerTool(tool: ToolDefinition) {
  // Check if the tool is already registered
  const existingToolIndex = availableTools.findIndex(t => t.name === tool.name);
  if (existingToolIndex !== -1) {
    // Replace existing tool
    availableTools[existingToolIndex] = tool;
  } else {
    // Add new tool
    availableTools.push(tool);
  }
}

// Execute a specific tool
export async function executeTool(toolName: string, parameters: any, context: ToolContext): Promise<ToolExecutionResult> {
  // Find the requested tool
  const tool = availableTools.find(t => t.name === toolName);
  
  if (!tool) {
    return {
      success: false,
      message: `Tool ${toolName} not found`,
      state: CommandExecutionState.FAILED
    };
  }
  
  // Check if the user has enough credits if required
  if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
    return {
      success: false,
      message: `Insufficient credits to use ${toolName}. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`,
      state: CommandExecutionState.FAILED
    };
  }
  
  try {
    // Execute the tool
    const result = await tool.execute(parameters, context);
    
    return {
      ...result,
      state: result.success ? CommandExecutionState.COMPLETED : CommandExecutionState.FAILED
    };
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : `Error executing tool ${toolName}`,
      error,
      state: CommandExecutionState.FAILED
    };
  }
}

// Export all tools from this central file
export * from './canvas-tool';
// Add more tool exports as they are created
