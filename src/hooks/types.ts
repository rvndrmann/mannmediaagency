
// General types used across hooks

// Tool definitions and execution types
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    default?: any;
    enum?: string[];
    required?: boolean;
  }>;
  requiredCredits?: number;
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  sessionId?: string;
  conversationId?: string;
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  requestId?: string;
  [key: string]: any;
}

// Command execution state
export interface CommandExecutionState {
  toolName: string;
  parameters: Record<string, any>;
  result?: ToolResult;
  isExecuting: boolean;
  error?: string;
}
