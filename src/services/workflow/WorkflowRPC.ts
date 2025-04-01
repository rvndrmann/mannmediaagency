
import { supabase } from "@/integrations/supabase/client";
import { CanvasScene, WorkflowStage, WorkflowState } from "@/types/canvas";

/**
 * A service for interacting with workflow-related database operations using RPC
 * This is a safer approach than direct table access, especially for tables that
 * don't exist in the Database type definitions
 */
export class WorkflowRPC {
  private static instance: WorkflowRPC;
  
  static getInstance(): WorkflowRPC {
    if (!WorkflowRPC.instance) {
      WorkflowRPC.instance = new WorkflowRPC();
    }
    return WorkflowRPC.instance;
  }
  
  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData: Partial<WorkflowState>): Promise<WorkflowState | null> {
    try {
      const { data, error } = await supabase.rpc('create_workflow', {
        workflow_data: workflowData
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating workflow:", error);
      return null;
    }
  }
  
  /**
   * Get workflow by project ID
   */
  async getWorkflowByProject(projectId: string): Promise<WorkflowState | null> {
    try {
      const { data, error } = await supabase.rpc('get_workflow_by_project', {
        project_id: projectId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting workflow:", error);
      return null;
    }
  }
  
  /**
   * Update workflow stage
   */
  async moveToNextStage(
    projectId: string,
    currentStage: WorkflowStage,
    nextStage: WorkflowStage
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('move_workflow_stage', {
        project_id: projectId,
        current_stage: currentStage,
        next_stage: nextStage
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error moving workflow stage:", error);
      return false;
    }
  }
  
  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    projectId: string,
    status: 'in_progress' | 'completed' | 'failed',
    additionalData: any = {}
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_workflow_status', {
        project_id: projectId,
        status,
        additional_data: additionalData
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating workflow status:", error);
      return false;
    }
  }
  
  /**
   * Update workflow scene statuses
   */
  async updateWorkflowSceneStatuses(
    projectId: string,
    sceneStatuses: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_workflow_scene_statuses', {
        project_id: projectId,
        scene_statuses: sceneStatuses
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating workflow scene statuses:", error);
      return false;
    }
  }
  
  /**
   * Retry workflow from stage
   */
  async retryWorkflowFromStage(
    projectId: string,
    stage: WorkflowStage
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('retry_workflow_from_stage', {
        project_id: projectId,
        stage
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error retrying workflow stage:", error);
      return false;
    }
  }
}
