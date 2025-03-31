import { ToolDefinition } from "../types";

export const executeTool = async (toolName: string, parameters: any, context: any): Promise<any> => {
  // Check if the tool exists
  const tool = getTool(toolName);
  if (!tool) {
    console.warn(`Tool ${toolName} not found`);
    return {
      state: "FAILED",
      message: `Tool ${toolName} not found`
    };
  }

  // Check if the tool requires credits and if the user has enough credits
  if (tool.requiredCredits && context.userCredits !== undefined && context.userCredits < tool.requiredCredits) {
    return {
      state: "FAILED",
      message: `Insufficient credits to use tool ${toolName}. Required: ${tool.requiredCredits}, Available: ${context.userCredits}`
    };
  }

  // Execute the tool
  try {
    const result = await tool.execute(parameters, context);

    // Check if the tool execution was successful
    if (result.success) {
      return {
        state: "COMPLETED",
        message: result.message || `Tool ${toolName} executed successfully`,
        data: result.data
      };
    } else {
      return {
        state: "FAILED",
        message: result.message || `Tool ${toolName} execution failed`,
        data: result.data
      };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      state: "FAILED",
      message: `Error executing tool ${toolName}: ${error.message || error}`
    };
  }
};

// Mock getTool function (replace with your actual implementation)
const getTool = (toolName: string): ToolDefinition | undefined => {
  // Replace this with your actual tool retrieval logic
  return undefined;
};
