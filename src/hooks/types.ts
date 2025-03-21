
export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}
