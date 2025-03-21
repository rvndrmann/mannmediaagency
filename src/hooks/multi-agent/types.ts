
import { Attachment } from "@/types/message";

// Tool types
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    default?: any;
    required?: boolean;
  }>;
  requiredCredits: number;
  execute: (
    params: Record<string, any>,
    context: ToolContext
  ) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments?: Attachment[];
  selectedTool?: string;
  previousOutputs: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export interface CommandExecutionState {
  commandId: string;
  status: "pending" | "executing" | "completed" | "failed";
  startTime: Date;
  endTime?: Date;
  result?: ToolResult;
  error?: string;
}

// Agent runner types
export interface RunResult {
  message: string;
  data?: any;
  error?: string;
}

export interface AgentRunnerCallbacks {
  onMessage: (message: any) => void;
  onError: (error: string) => void;
  onHandoffEnd?: (toAgent: string) => void;
}

export interface AgentRunnerOptions {
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: {
    userId: string;
    sessionId: string;
  };
  runId: string;
  groupId: string;
}
