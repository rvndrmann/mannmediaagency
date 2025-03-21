
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { CustomOrder } from "./custom-order";

export type ProcessingStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'approved' | 'rejected';

export type WorkflowStatus = 'in_progress' | 'completed' | 'failed' | 'paused';

export type ProcessingStage = {
  id: string;
  order_id: string;
  stage_name: string;
  status: ProcessingStageStatus;
  agent_type: AgentType;
  input_data?: any;
  output_data?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export type OrchestrationWorkflow = {
  id: string;
  order_id: string;
  status: WorkflowStatus;
  current_stage?: string;
  workflow_data: {
    order_id: string;
    stages: string[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export type StageDisplayInfo = {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  agent: AgentType;
  description: string;
};

export type WorkflowWithDetails = {
  workflow: OrchestrationWorkflow;
  stages: ProcessingStage[];
  order: CustomOrder;
  currentStageIndex: number;
};
