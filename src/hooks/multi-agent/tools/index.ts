
import { ToolDefinition } from "../types";
import { defaultTools } from "./default-tools";

let toolSystem: {
  availableTools: ToolDefinition[];
  isInitialized: boolean;
} = {
  availableTools: [],
  isInitialized: false
};

export const initializeToolSystem = async (): Promise<void> => {
  try {
    // Initialize with default tools
    toolSystem.availableTools = [...defaultTools];
    toolSystem.isInitialized = true;
    
    console.log(`Tool system initialized with ${toolSystem.availableTools.length} tools`);
  } catch (error) {
    console.error("Failed to initialize tool system:", error);
    throw error;
  }
};

export const getAvailableTools = (): ToolDefinition[] => {
  if (!toolSystem.isInitialized) {
    console.warn("Tool system not initialized yet, returning empty tool list");
    return [];
  }
  return toolSystem.availableTools;
};

export const addTool = (tool: ToolDefinition): void => {
  if (!toolSystem.isInitialized) {
    console.warn("Tool system not initialized yet, initializing now");
    toolSystem.availableTools = [...defaultTools];
    toolSystem.isInitialized = true;
  }
  
  // Check if tool with same name already exists
  const existingToolIndex = toolSystem.availableTools.findIndex(t => t.name === tool.name);
  if (existingToolIndex >= 0) {
    // Replace existing tool
    toolSystem.availableTools[existingToolIndex] = tool;
  } else {
    // Add new tool
    toolSystem.availableTools.push(tool);
  }
};
