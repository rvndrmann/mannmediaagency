
import { ToolContext, ToolResult } from "@/hooks/types";
import { Message } from "@/types/message";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    default?: any;
    required?: boolean;
  }>;
  requiredCredits: number;
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface CommandExecutionState {
  isExecuting: boolean;
  output: string | null;
  error: string | null;
}

export { ToolContext, ToolResult };
