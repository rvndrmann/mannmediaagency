
export enum CommandExecutionState {
  COMPLETED = "completed",
  FAILED = "failed",
  PROCESSING = "processing",
  ERROR = "error",
  PENDING = "pending",
  RUNNING = "running",
  CANCELLED = "cancelled"
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  state: CommandExecutionState;
  usage?: {
    creditsUsed?: number;
  };
}

export interface ToolContext {
  supabase: any;
  user: any;
  session: any;
  userId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>;
  parameters: {
    type: string;
    properties: { [key: string]: any };
    required: string[];
  };
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  requiredCredits?: number;
  version?: string;
}
