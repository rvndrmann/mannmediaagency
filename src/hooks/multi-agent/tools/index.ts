
import { ToolContext, ToolExecutionResult } from "../runner/types";

// Define the ToolDefinition interface
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

// Define some common tool utilities or exports here
export const createBasicTool = (
  name: string,
  description: string,
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>
): ToolDefinition => {
  return {
    name,
    description,
    parameters: {
      type: "object",
      properties: {}
    },
    execute
  };
};

// Export a registry of available tools
export const availableTools: Record<string, ToolDefinition> = {};

// Function to register a new tool in the system
export const registerTool = (tool: ToolDefinition): void => {
  availableTools[tool.name] = tool;
};
