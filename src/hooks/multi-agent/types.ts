
/**
 * Context provided to tools when they are executed
 */
export interface ToolContext {
  // The ID of the user running the tool
  userId?: string;
  // The ID of the conversation
  conversationId?: string;
  // The ID of the current run
  runId?: string;
  // The agent type that initiated the tool call
  agentType?: string;
  // Additional metadata
  metadata?: Record<string, any>;
  // The number of credits the user has remaining
  creditsRemaining?: number;
}

/**
 * Result from a tool execution
 */
export interface ToolResult {
  // Content to be displayed to the user
  content: string;
  // Whether the tool execution was successful
  success: boolean;
  // Message for the agent (may be different from content)
  message: string;
  // Additional metadata from the tool execution
  metadata?: Record<string, any>;
  // Content that should not be displayed to the user
  privateContent?: string;
}

/**
 * A tool that can be executed by an agent
 */
export interface Tool {
  // The name of the tool
  name: string;
  // A description of what the tool does
  description: string;
  // The required credits to use this tool
  requiredCredits?: number;
  // The parameters for the tool
  parameters?: Record<string, any>;
  // The schema for the parameters
  parametersSchema?: Record<string, any>;
  // The function to execute the tool
  execute: (parameters: Record<string, any>) => Promise<ToolResult>;
}

/**
 * State of a command execution
 */
export interface CommandExecutionState {
  // Unique ID for this command execution
  commandId: string;
  // Status of the execution
  status: "pending" | "executing" | "completed" | "failed";
  // When the execution started
  startTime: Date;
  // When the execution ended (if applicable)
  endTime?: Date;
  // The result of the execution (if available)
  result?: ToolResult;
  // Error message if the execution failed
  error?: string;
}
