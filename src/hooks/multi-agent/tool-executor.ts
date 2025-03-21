
import { Command } from "@/types/message";
import { ToolContext, ToolResult } from "./types";
import { getTool } from "./tools";
import { toast } from "sonner";

class ToolExecutor {
  async executeCommand(command: Command, context: ToolContext): Promise<ToolResult> {
    try {
      console.log(`Executing command: ${command.feature}`, command.parameters);
      
      // Get the tool definition
      const tool = getTool(command.feature.toString());
      
      if (!tool) {
        console.error(`Tool not found: ${command.feature}`);
        return {
          success: false,
          message: `Tool "${command.feature}" not found. Available tools: ${this.getAvailableToolNames().join(", ")}`
        };
      }
      
      // Check if user has enough credits
      if (tool.requiredCredits > context.creditsRemaining) {
        console.error(`Insufficient credits for tool: ${tool.name}. Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining}`);
        return {
          success: false,
          message: `Insufficient credits to use the "${tool.name}" tool. Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining}`
        };
      }
      
      // Execute the tool
      const result = await tool.execute(command.parameters || {}, context);
      
      // Add the tool's previous output to the context for later reference
      if (context.previousOutputs && result.success && result.data) {
        context.previousOutputs[tool.name] = result.data;
      }
      
      return result;
    } catch (error) {
      console.error("Error executing tool command:", error);
      toast.error(`Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        message: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private getAvailableToolNames(): string[] {
    // Get all registered tools from the tools registry
    const tools = Object.values(getTool("") ? {} : {});
    
    // Safely extract the name from each tool
    return tools.map(tool => {
      if (typeof tool === 'object' && tool !== null && 'name' in tool) {
        return String(tool.name || '');
      }
      return '';
    }).filter(Boolean);
  }
}

export const toolExecutor = new ToolExecutor();
