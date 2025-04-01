
export enum CommandExecutionState {
  COMPLETED = "completed",
  FAILED = "failed",
  PROCESSING = "processing",
  ERROR = "error"
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  state: CommandExecutionState;
}

export interface ToolContext {
  supabase: any;
  user: any;
  session: any;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  userCredits?: number;
  metadata?: Record<string, any>;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  addMessage?: (message: string, type: string) => void;
  toolAvailable?: boolean; 
  history?: any[];
  tracingEnabled?: boolean;
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
}
