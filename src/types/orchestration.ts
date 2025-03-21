
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { CustomOrder } from "./custom-order";
import { ReactNode } from "react";

export type ProcessingStageStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "approved" 
  | "rejected" 
  | "failed";

export type WorkflowStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "failed" 
  | "cancelled";

export interface StageDisplayInfo {
  name: string;
  displayName: string;
  icon: ReactNode;
  agent: AgentType;
  description: string;
}

export interface ProcessingStage {
  id: string;
  order_id: string;
  stage_name: string;
  status: ProcessingStageStatus;
  agent_type: AgentType;
  input_data: any;
  output_data?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface OrchestrationWorkflow {
  id: string;
  order_id: string;
  status: WorkflowStatus;
  current_stage: string;
  workflow_data: {
    stages: string[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface WorkflowWithDetails {
  workflow: OrchestrationWorkflow;
  stages: ProcessingStage[];
  order: CustomOrder;
  currentStageIndex: number;
}
