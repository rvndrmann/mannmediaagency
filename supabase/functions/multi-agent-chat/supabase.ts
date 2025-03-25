
// Interface for the API response from the multi-agent-chat function

export interface AgentResponse {
  completion: string;
  handoffRequest?: {
    targetAgent: string;
    reason: string;
  };
  modelUsed: string;
  error?: string;
}

export interface ToolExecutionResponse {
  success: boolean;
  message: string;
  taskId?: string;
  jobId?: string;
  error?: string;
}
