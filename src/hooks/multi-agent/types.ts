
import { Message } from "@/types/message";
import { RunnerContext } from "./runner/types";

export enum CommandExecutionState {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS"
}

export interface ToolContext extends RunnerContext {
  toolAvailable: boolean;
  userCredits?: number;
}

export interface ToolMetadata {
  category: string;
  displayName?: string;
  icon?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  version?: string;
  requiredCredits?: number;
  parameters: any;
  execute: (parameters: any, context: RunnerContext) => Promise<{
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    usage?: {
      creditsUsed: number;
    };
  }>;
  metadata?: ToolMetadata;
}

export interface ExecutorContext {
  messages: Message[];
  addMessage?: (content: string, role: string) => void;
  userCredits?: number;
  projectId?: string;
  sessionId?: string;
  runId?: string;
  groupId?: string;
}

// Add missing types referenced in tools
export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}
