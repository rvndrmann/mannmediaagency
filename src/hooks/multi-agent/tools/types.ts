
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
  CANCELED = "canceled"
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  state: CommandExecutionState;
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
  execute: (parameters: any, context: ToolContext) => Promise<ToolResult>;
}
