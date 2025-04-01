
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
      // Get current workflow state
      const { data: workflow, error: getError } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();
      
      if (getError) throw getError;
      
      // Update the stage status
      const updatedState: Partial<WorkflowState> = {
        ...workflow,
        stageResults: {
          ...(workflow.stageResults || {}),
          [stage]: result
        }
      };
      
      // If the stage completed, add it to completedStages
      if (status === 'completed') {
        updatedState.completedStages = [
          ...(workflow.completedStages || []),
          stage
        ];
      }
      
      // Update the workflow state
      const { error: updateError } = await supabase
        .from('workflow_states')
        .update(updatedState)
        .eq('id', workflow.id);
      
      if (updateError) throw updateError;
      
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
      // Get current workflow state
      const { data: workflow, error: getError } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();
      
      if (getError) throw getError;
      
      // Update the current stage
      const { error: updateError } = await supabase
        .from('workflow_states')
        .update({
          currentStage: nextStage,
          updatedAt: new Date().toISOString()
        })
        .eq('id', workflow.id);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error("Error progressing to next stage:", error);
      return false;
    }
  }
}
