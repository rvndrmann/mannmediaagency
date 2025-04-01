
import { supabase } from "@/integrations/supabase/client";
import { checkTableExists } from "@/hooks/product-shoot/rpc-functions";
import { MockWorkflowService } from "./mock-workflow-service";
import { WorkflowState, WorkflowStage } from "@/types/canvas";

/**
 * Service for workflow RPC functions
 */
export class WorkflowRPC {
  private static instance: WorkflowRPC;
  private hasWorkflowTable: boolean = false;
  
  private constructor() {}
  
  /**
   * Initialize the service and check for required tables
   */
  private async initialize() {
    try {
      this.hasWorkflowTable = await checkTableExists('workflow_states');
      console.log("Workflow states table exists:", this.hasWorkflowTable);
    } catch (error) {
      console.error("Error checking for workflow_states table:", error);
      this.hasWorkflowTable = false;
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): WorkflowRPC {
    if (!WorkflowRPC.instance) {
      WorkflowRPC.instance = new WorkflowRPC();
      WorkflowRPC.instance.initialize();
    }
    return WorkflowRPC.instance;
  }
  
  /**
   * Start a new workflow
   */
  async startWorkflow(projectId: string): Promise<WorkflowState> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.createWorkflowState(projectId);
    }
    
    // Check if a workflow already exists
    const { data: existingWorkflow } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
      
    if (existingWorkflow) {
      // Update existing workflow
      const { data, error } = await supabase
        .from('workflow_states')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .select()
        .single();
        
      if (error) throw error;
      return this.mapToWorkflowState(data);
    }
    
    // Create new workflow
    const { data, error } = await supabase
      .from('workflow_states')
      .insert({
        project_id: projectId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return this.mapToWorkflowState(data);
  }
  
  /**
   * Update a workflow stage
   */
  async updateWorkflowStage(
    projectId: string, 
    stage: WorkflowStage, 
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: any
  ): Promise<WorkflowState> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.updateWorkflowState(projectId, {
        currentStage: stage,
        stageResults: result ? { [stage]: result } : undefined
      });
    }
    
    const { data: workflow } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('project_id', projectId)
      .single();
      
    if (!workflow) {
      throw new Error(`No workflow found for project ${projectId}`);
    }
    
    // Update stage result
    const stageResults = { ...(workflow.stage_results || {}) };
    if (result) {
      stageResults[stage] = result;
    }
    
    // Update completed stages
    let completedStages: string[] = [];
    if (workflow.completed_stages && Array.isArray(workflow.completed_stages)) {
      completedStages = [...workflow.completed_stages];
    }
    
    if (status === 'completed' && !completedStages.includes(stage)) {
      completedStages.push(stage);
    }
    
    const { data, error } = await supabase
      .from('workflow_states')
      .update({
        current_stage: stage,
        stage_results: stageResults,
        completed_stages: completedStages
      })
      .eq('project_id', projectId)
      .select()
      .single();
      
    if (error) throw error;
    return this.mapToWorkflowState(data);
  }
  
  /**
   * Complete a workflow
   */
  async completeWorkflow(projectId: string): Promise<WorkflowState> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.updateWorkflowState(projectId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }
    
    const { data, error } = await supabase
      .from('workflow_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .select()
      .single();
      
    if (error) throw error;
    return this.mapToWorkflowState(data);
  }
  
  /**
   * Map database record to WorkflowState
   */
  private mapToWorkflowState(data: any): WorkflowState {
    return {
      projectId: data.project_id,
      status: data.status,
      currentStage: data.current_stage,
      stageResults: data.stage_results,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedStages: data.completed_stages,
      errorMessage: data.error_message,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      sceneStatuses: data.scene_statuses
    };
  }
}
