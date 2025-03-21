import { Command } from "@/types/message";
import { CommandExecutionState, ToolContext, ToolResult } from "./types";
import { getTool } from "./tools";

export class ToolExecutor {
  private executionStates: Map<string, CommandExecutionState> = new Map();
  
  // Execute a command
  async executeCommand(
    command: Command, 
    context: ToolContext
  ): Promise<ToolResult> {
    // Generate a unique ID for this execution
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create initial execution state
    const executionState: CommandExecutionState = {
      commandId,
      status: "pending",
      startTime: new Date()
    };
    
    this.executionStates.set(commandId, executionState);
    
    try {
      // Update status to executing
      this.updateExecutionState(commandId, {
        status: "executing"
      });
      
      // Get the tool - log more information for debugging
      console.log(`Executing tool: ${command.feature}`);
      const tool = getTool(command.feature);
      if (!tool) {
        console.error(`Tool not found: ${command.feature}`);
        return this.handleError(commandId, `Tool '${command.feature}' not found`);
      }
      
      // Check if the user has enough credits
      if (context.creditsRemaining < tool.requiredCredits) {
        console.log(`Insufficient credits for tool ${command.feature}. Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining}`);
        return this.handleError(
          commandId, 
          `Insufficient credits to use ${tool.name}. Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining}`
        );
      }
      
      // Log parameters for debugging
      console.log(`Executing tool with parameters:`, command.parameters);
      
      // Execute the tool
      const result = await tool.execute(command.parameters || {}, context);
      
      // Log the result
      console.log(`Tool execution result:`, result);
      
      // Update state with result
      this.updateExecutionState(commandId, {
        status: result.success ? "completed" : "failed",
        result,
        endTime: new Date(),
        error: result.success ? undefined : result.message
      });
      
      return result;
    } catch (error) {
      console.error("Error executing tool command:", error);
      return this.handleError(
        commandId, 
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    }
  }
  
  // Get the current state of a command execution
  getExecutionState(commandId: string): CommandExecutionState | undefined {
    return this.executionStates.get(commandId);
  }
  
  // Get all execution states
  getAllExecutionStates(): CommandExecutionState[] {
    return Array.from(this.executionStates.values());
  }
  
  // Private helpers
  private updateExecutionState(
    commandId: string, 
    updates: Partial<CommandExecutionState>
  ): void {
    const currentState = this.executionStates.get(commandId);
    if (currentState) {
      this.executionStates.set(commandId, { ...currentState, ...updates });
    }
  }
  
  private handleError(commandId: string, errorMessage: string): ToolResult {
    this.updateExecutionState(commandId, {
      status: "failed",
      error: errorMessage,
      endTime: new Date()
    });
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

// Create a singleton instance
export const toolExecutor = new ToolExecutor();
