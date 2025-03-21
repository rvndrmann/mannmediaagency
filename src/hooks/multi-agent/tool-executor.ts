
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
      
      // Log command and context for debugging
      console.log(`Executing tool command:`, {
        feature: command.feature,
        parameters: command.parameters,
        confidence: command.confidence,
        type: command.type || "standard"
      });
      
      console.log(`Tool context:`, {
        userId: context.userId,
        creditsRemaining: context.creditsRemaining,
        attachments: context.attachments ? `${context.attachments.length} attachments` : "none",
        selectedTool: context.selectedTool
      });
      
      // Get the tool - log more information for debugging
      console.log(`Resolving tool: ${command.feature}`);
      const tool = getTool(command.feature);
      if (!tool) {
        console.error(`Tool not found: ${command.feature}`);
        return this.handleError(commandId, `Tool '${command.feature}' not found`);
      }
      
      // Validate required parameters
      if (tool.parameters) {
        const missingRequiredParams = Object.entries(tool.parameters)
          .filter(([key, value]) => value.required && !(command.parameters && key in command.parameters))
          .map(([key]) => key);
        
        if (missingRequiredParams.length > 0) {
          const errorMessage = `Missing required parameters: ${missingRequiredParams.join(', ')}`;
          console.error(errorMessage);
          return this.handleError(commandId, errorMessage);
        }
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
      
      // Execute the tool with timeout handling
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool execution timed out after 30 seconds`)), 30000);
      });
      
      const executionPromise = tool.execute(command.parameters || {}, context);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Log the result
      console.log(`Tool execution result:`, {
        success: result.success, 
        message: result.message.substring(0, 100) + (result.message.length > 100 ? '...' : ''),
        data: result.data ? 'Present' : 'None'
      });
      
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
  
  // Get recent execution states (last 24 hours)
  getRecentExecutionStates(): CommandExecutionState[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return Array.from(this.executionStates.values())
      .filter(state => state.startTime >= oneDayAgo)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
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
    console.error(`Tool execution error: ${errorMessage}`);
    
    this.updateExecutionState(commandId, {
      status: "failed",
      error: errorMessage,
      endTime: new Date()
    });
    
    return {
      success: false,
      message: `Error: ${errorMessage}`
    };
  }
}

// Create a singleton instance
export const toolExecutor = new ToolExecutor();
