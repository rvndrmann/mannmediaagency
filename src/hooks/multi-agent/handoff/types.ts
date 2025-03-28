
import { Attachment } from "@/types/message";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { ToolContext } from "../types";

export interface HandoffInputData {
  inputHistory: string[] | Attachment[];
  preHandoffItems: any[];
  newItems: any[];
  
  // Computed property for convenience
  get allItems() {
    return [...this.preHandoffItems, ...this.newItems];
  }
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
}

export interface HandoffRequest {
  targetAgent: AgentType;
  reason: string;
  context?: Record<string, any>;
}
