
export interface ToolContext {
  userId?: string;
  projectId?: string;
  sceneId?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export enum CommandExecutionState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELED = "canceled",
  CANCELLED = "cancelled", // Alternative spelling for compatibility
  ERROR = "error",
  PROCESSING = "processing"
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  state: CommandExecutionState;
  error?: string;
  usage?: {
    creditsUsed?: number;
  };
}

// Add this export to fix the missing ToolExecutionResult error
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
  state: CommandExecutionState;
  usage?: {
    creditsUsed?: number;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  requiredCredits?: number;
  version?: string;
  execute: (parameters: any, context: ToolContext) => Promise<ToolResult>;
}
