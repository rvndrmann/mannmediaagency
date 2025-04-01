
import { supabase } from "@/integrations/supabase/client";
import { CanvasScene, WorkflowState } from "@/types/canvas";
import { checkTableExists } from "@/hooks/product-shoot/rpc-functions";
import { MockWorkflowService } from "./mock-workflow-service";

/**
 * Service for managing video generation workflows
 */
export class VideoWorkflowService {
  private static instance: VideoWorkflowService;
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
  public static getInstance(): VideoWorkflowService {
    if (!VideoWorkflowService.instance) {
      VideoWorkflowService.instance = new VideoWorkflowService();
      VideoWorkflowService.instance.initialize();
    }
    return VideoWorkflowService.instance;
  }
  
  /**
   * Create a new workflow state for a project
   */
  async createWorkflowState(projectId: string): Promise<WorkflowState> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.createWorkflowState(projectId);
    }
    
    const { data, error } = await supabase
      .from('workflow_states')
      .insert({
        project_id: projectId,
        status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error creating workflow state:", error);
      throw error;
    }
    
    return this.mapToWorkflowState(data);
  }
  
  /**
   * Get the workflow state for a project
   */
  async getWorkflowState(projectId: string): Promise<WorkflowState | null> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.getWorkflowState(projectId);
    }
    
    const { data, error } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
      
    if (error) {
      console.error("Error getting workflow state:", error);
      throw error;
    }
    
    return data ? this.mapToWorkflowState(data) : null;
  }
  
  /**
   * Update a workflow state
   */
  async updateWorkflowState(projectId: string, updates: Partial<WorkflowState>): Promise<WorkflowState> {
    if (!this.hasWorkflowTable) {
      return MockWorkflowService.updateWorkflowState(projectId, updates);
    }
    
    const updateData = {
      status: updates.status,
      current_stage: updates.currentStage,
      stage_results: updates.stageResults,
      completed_stages: updates.completedStages,
      error_message: updates.errorMessage,
      started_at: updates.startedAt,
      completed_at: updates.completedAt,
      scene_statuses: updates.sceneStatuses
    };
    
    const { data, error } = await supabase
      .from('workflow_states')
      .update(updateData)
      .eq('project_id', projectId)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating workflow state:", error);
      throw error;
    }
    
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
