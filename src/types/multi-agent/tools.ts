
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  version?: string;
}

export interface ToolContext {
  runId: string;
  groupId: string;
  userId: string;
  metadata: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  usage?: {
    creditsUsed: number;
  };
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolExecutionOptions {
  abortSignal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPartialResult?: (result: any) => void;
}
