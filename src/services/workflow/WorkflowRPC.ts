
import { supabase } from "@/integrations/supabase/client";
import { StageResult } from "./types";
import { WorkflowStage, WorkflowState } from '@/types/canvas';

export class WorkflowRPC {
  private static instance: WorkflowRPC;
  
  private constructor() {}
  
  public static getInstance(): WorkflowRPC {
    if (!WorkflowRPC.instance) {
      WorkflowRPC.instance = new WorkflowRPC();
    }
    return WorkflowRPC.instance;
  }
  
  public async updateStageStatus(
    projectId: string,
    stage: WorkflowStage,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: StageResult
  ): Promise<boolean> {
    try {
      // Since the workflow_states table doesn't exist, we'll log the operation
      console.log(`Mock updating stage status for project ${projectId}:`, {
        stage,
        status,
        result
      });
      
      return true;
    } catch (error) {
      console.error("Error updating stage status:", error);
      return false;
    }
  }
  
  public async progressToNextStage(
    projectId: string,
    nextStage: WorkflowStage
  ): Promise<boolean> {
    try {
      // Since the workflow_states table doesn't exist, we'll log the operation
      console.log(`Mock progressing to next stage for project ${projectId}:`, {
        nextStage
      });
      
      return true;
    } catch (error) {
      console.error("Error progressing to next stage:", error);
      return false;
    }
  }
}
