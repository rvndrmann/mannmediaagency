
export interface ToolContext {
  userId: string;
  conversationId: string;
  messageHistory: any[];
  creditsRemaining?: number;
  attachments?: any[];
}

export interface ToolResult {
  success: boolean;
  result: string;
  error?: string;
  data?: any;
  message?: string;
}
