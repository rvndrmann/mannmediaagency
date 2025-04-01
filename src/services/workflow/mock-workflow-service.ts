
import { WorkflowState, WorkflowStage } from "@/types/canvas";

/**
 * Mock implementation of workflow services to handle missing workflow_states table
 */
export class MockWorkflowService {
  /**
   * Create a new workflow state
   */
  static async createWorkflowState(projectId: string): Promise<WorkflowState> {
    console.log("Creating mock workflow state for", projectId);
    
    return {
      projectId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedStages: [],
    };
  }
  
  /**
   * Get a workflow state by project ID
   */
  static async getWorkflowState(projectId: string): Promise<WorkflowState | null> {
    console.log("Getting mock workflow state for", projectId);
    
    return {
      projectId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedStages: [],
    };
  }
  
  /**
   * Update a workflow state
   */
  static async updateWorkflowState(projectId: string, updates: Partial<WorkflowState>): Promise<WorkflowState> {
    console.log("Updating mock workflow state for", projectId, updates);
    
    return {
      projectId,
      status: updates.status || 'pending',
      currentStage: updates.currentStage,
      stageResults: updates.stageResults || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedStages: updates.completedStages || [],
      errorMessage: updates.errorMessage,
      startedAt: updates.startedAt,
      completedAt: updates.completedAt,
      sceneStatuses: updates.sceneStatuses || {},
    };
  }
  
  /**
   * Complete a workflow stage
   */
  static async completeWorkflowStage(
    projectId: string, 
    stage: WorkflowStage, 
    result: any
  ): Promise<WorkflowState> {
    console.log("Completing mock workflow stage for", projectId, stage, result);
    
    return {
      projectId,
      status: 'in_progress',
      currentStage: stage,
      stageResults: { [stage]: result },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedStages: [stage],
    };
  }
}
