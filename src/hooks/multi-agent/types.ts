
import { Attachment } from "@/types/message";

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments?: Attachment[];
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}
