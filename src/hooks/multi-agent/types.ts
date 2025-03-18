
import { Attachment, Command } from "@/types/message";

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments: Attachment[];
  selectedTool?: string;
  previousOutputs: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  requestId?: string;
  data?: any;
}

export interface CommandExecutionState {
  commandId: string;
  status: "pending" | "executing" | "completed" | "failed";
  startTime: Date;
  endTime?: Date;
  result?: ToolResult;
  error?: string;
}
