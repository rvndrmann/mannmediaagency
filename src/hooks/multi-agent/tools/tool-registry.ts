
import { ToolDefinition, CommandExecutionState } from "./types";

// Create dataTool
export const dataTool: ToolDefinition = {
  name: "data-tool",
  description: "Tool for data operations",
  execute: async function() {
    return {
      success: true,
      message: "Data operation executed",
      data: { result: "Success" },
      state: CommandExecutionState.COMPLETED
    };
  },
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["fetch", "store", "process"],
        description: "The operation to perform on the data"
      }
    },
    required: ["operation"]
  }
};

// Create browserUseTool
export const browserUseTool: ToolDefinition = {
  name: "browser-use-tool",
  description: "Tool for browser automation",
  execute: async function() {
    return {
      success: true,
      message: "Browser operation executed",
      data: { result: "Success" },
      state: CommandExecutionState.COMPLETED
    };
  },
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "The browser task to perform"
      }
    },
    required: ["task"]
  }
};

// Register all available tools
export const availableTools: ToolDefinition[] = [
  dataTool,
  browserUseTool
];

// Function to get all available tools
export const getAvailableTools = (): ToolDefinition[] => {
  return [...availableTools];
};
