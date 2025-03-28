
import { Attachment } from "@/types/message";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { ToolContext } from "../types";

export interface HandoffInputData {
  inputHistory: string[] | Attachment[];
  preHandoffItems: any[];
  newItems: any[];
  allItems: any[]; // Changed from getter to property
  conversationContext?: Record<string, any>; // For passing additional context data
}

export type HandoffInputFilter = (data: HandoffInputData) => HandoffInputData;

export interface HandoffOptions {
  targetAgent: AgentType;
  reason: string;
  toolName?: string;
  toolDescription?: string;
  inputFilter?: HandoffInputFilter;
  preserveContext?: boolean;
  additionalContext?: Record<string, any>;
  includeFullHistory?: boolean; // New option to control history transfer
}

export interface HandoffRequest {
  targetAgent: AgentType;
  reason: string;
  context?: Record<string, any>;
  preserveFullHistory?: boolean; // Flag to indicate full history should be preserved
  additionalContext?: Record<string, any>; // Additional context data for the target agent
}
