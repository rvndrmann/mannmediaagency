
import { VideoWorkflowService } from "@/services/workflow/VideoWorkflowService";
import { WorkflowRPC } from "@/services/workflow/WorkflowRPC";
import { WorkflowStage, WorkflowState } from "@/types/canvas";
import { v4 as uuidv4 } from "uuid";

/**
 * Handles integration between the Agent SDK and Model Context Protocol (MCP)
 * for workflow management and state tracking.
 */
export class AgentSDKWorkflowManager {
  private videoWorkflowService: VideoWorkflowService;
  private workflowRPC: WorkflowRPC;
  private projectId: string | null = null;
  private currentWorkflowState: WorkflowState | null = null;
  
  constructor(projectId?: string) {
    this.videoWorkflowService = VideoWorkflowService.getInstance();
    this.workflowRPC = WorkflowRPC.getInstance();
    
    if (projectId) {
      this.projectId = projectId;
      this.loadWorkflowState();
    }
  }
  
  /**
   * Set the current project ID and load its workflow state
   */
  async setProject(projectId: string): Promise<void> {
    this.projectId = projectId;
    await this.loadWorkflowState();
  }
  
  /**
   * Get the current workflow state
   */
  getWorkflowState(): WorkflowState | null {
    return this.currentWorkflowState;
  }
  
  /**
   * Load the workflow state for the current project
   */
  private async loadWorkflowState(): Promise<void> {
    if (!this.projectId) return;
    
    try {
      const state = await this.videoWorkflowService.getWorkflowState(this.projectId);
      this.currentWorkflowState = state;
      
      // Create workflow state if it doesn't exist
      if (!state) {
        const newState = await this.videoWorkflowService.createWorkflowState(this.projectId);
        this.currentWorkflowState = newState;
      }
    } catch (error) {
      console.error("Error loading workflow state:", error);
    }
  }
  
  /**
   * Start a workflow for the current project
   */
  async startWorkflow(): Promise<WorkflowState> {
    if (!this.projectId) {
      throw new Error("Project ID is not set");
    }
    
    const state = await this.workflowRPC.startWorkflow(this.projectId);
    this.currentWorkflowState = state;
    return state;
  }
  
  /**
   * Update a workflow stage for the current project
   */
  async updateWorkflowStage(
    stage: WorkflowStage,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: any
  ): Promise<WorkflowState> {
    if (!this.projectId) {
      throw new Error("Project ID is not set");
    }
    
    const state = await this.workflowRPC.updateWorkflowStage(
      this.projectId,
      stage,
      status,
      result
    );
    
    this.currentWorkflowState = state;
    return state;
  }
  
  /**
   * Mark the workflow as complete
   */
  async completeWorkflow(): Promise<WorkflowState> {
    if (!this.projectId) {
      throw new Error("Project ID is not set");
    }
    
    const state = await this.workflowRPC.completeWorkflow(this.projectId);
    this.currentWorkflowState = state;
    return state;
  }
  
  /**
   * Track scene status within the workflow
   */
  async updateSceneStatus(
    sceneId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    data?: any
  ): Promise<WorkflowState> {
    if (!this.projectId || !this.currentWorkflowState) {
      throw new Error("Project ID or workflow state is not set");
    }
    
    // Update scene statuses
    const sceneStatuses = { 
      ...(this.currentWorkflowState.sceneStatuses || {}),
      [sceneId]: {
        status,
        updatedAt: new Date().toISOString(),
        data
      }
    };
    
    // Calculate overall progress
    const scenes = Object.values(sceneStatuses);
    const completedScenes = scenes.filter(s => s.status === 'completed').length;
    const progress = scenes.length > 0 ? Math.round((completedScenes / scenes.length) * 100) : 0;
    
    // Update the workflow state
    const state = await this.videoWorkflowService.updateWorkflowState(this.projectId, {
      sceneStatuses,
      progress
    });
    
    this.currentWorkflowState = state;
    return state;
  }
  
  /**
   * Create a valid MCP operation based on the workflow state
   */
  createMCPOperation(operation: string, params: Record<string, any> = {}): Record<string, any> {
    return {
      id: uuidv4(),
      operation,
      status: "pending",
      params: {
        ...params,
        projectId: this.projectId,
        workflowState: this.currentWorkflowState
      },
      timestamp: new Date().toISOString()
    };
  }
}
