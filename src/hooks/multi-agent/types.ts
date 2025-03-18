
import { Message, Attachment, Task } from "@/types/message";

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments: Attachment[];
  selectedTool?: string;
  previousOutputs?: Record<string, any>;
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
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ImageGenerationOutput {
  imageUrl: string;
  prompt: string;
  settings?: Record<string, any>;
}

export interface VideoGenerationOutput {
  videoUrl: string;
  prompt: string;
  sourceImageUrl: string;
}

export interface CommandExecutionState {
  commandId: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: ToolResult;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

// Task type with proper status enum values
export type TaskStatus = "pending" | "in-progress" | "completed" | "error";
