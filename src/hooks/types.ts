
import { Message } from "@/types/message";

export interface ToolContext {
  userId: string;
  conversationId: string;
  messageHistory: Message[];
  creditsRemaining?: number;
}

export interface ToolResult {
  success: boolean;
  result: string;
  message: string;
  data?: Record<string, any>;
}
