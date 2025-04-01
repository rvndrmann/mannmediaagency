import { useState, useEffect, useCallback } from 'react';
import { AgentSDKWorkflowManager } from './sdk/AgentSDKWorkflowManager';
import { WorkflowStage, WorkflowState } from '@/types/canvas';
import { useCanvasProjects } from '../use-canvas-projects';
import { toast } from 'sonner';

interface UseAgentSDKWorkflowProps {
  projectId?: string;
}

export function useAgentSDKWorkflow({ projectId }: UseAgentSDKWorkflowProps = {}) {
  const [workflowManager, setWorkflowManager] = useState<AgentSDKWorkflowManager | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<WorkflowStage | null>(null);
  const { project } = useCanvasProjects();
  
  // Initialize the workflow manager when project ID changes
  useEffect(() => {
    if (projectId) {
      const manager = new AgentSDKWorkflowManager();
      setWorkflowManager(manager);
      
      // Load the initial workflow state
      const loadWorkflowState = async () => {
        try {
          await manager.setProject(projectId);
          const state = manager.getWorkflowState();
          setWorkflowState(state);
          if (state?.currentStage) {
            setCurrentStage(state.currentStage);
          }
        } catch (error) {
          console.error("Error loading workflow state:", error);
        }
      };
      
      loadWorkflowState();
    }
  }, [projectId]);
  
  // Start a new workflow
  const startWorkflow = useCallback(async (): Promise<boolean> => {
    if (!workflowManager) return false;
    
    setIsLoading(true);
    try {
      const state = await workflowManager.startWorkflow();
      setWorkflowState(state);
      setCurrentStage(state.currentStage || null);
      return true;
    } catch (error) {
      console.error("Error starting workflow:", error);
      toast.error("Failed to start workflow");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowManager]);
  
  // Update a workflow stage
  const updateStage = useCallback(async (
    stage: WorkflowStage,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: any
  ): Promise<boolean> => {
    if (!workflowManager) return false;
    
    setIsLoading(true);
    try {
      const state = await workflowManager.updateWorkflowStage(stage, status, result);
      setWorkflowState(state);
      setCurrentStage(state.currentStage || null);
      return true;
    } catch (error) {
      console.error(`Error updating workflow stage ${stage}:`, error);
      toast.error(`Failed to update workflow stage: ${stage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowManager]);
  
  // Mark a workflow as complete
  const completeWorkflow = useCallback(async (): Promise<boolean> => {
    if (!workflowManager) return false;
    
    setIsLoading(true);
    try {
      const state = await workflowManager.completeWorkflow();
      setWorkflowState(state);
      toast.success("Workflow completed successfully");
      return true;
    } catch (error) {
      console.error("Error completing workflow:", error);
      toast.error("Failed to complete workflow");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowManager]);
  
  // Update a scene's status
  const updateSceneStatus = useCallback(async (
    sceneId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    data?: any
  ): Promise<boolean> => {
    if (!workflowManager) return false;
    
    try {
      const state = await workflowManager.updateSceneStatus(sceneId, status, data);
      setWorkflowState(state);
      return true;
    } catch (error) {
      console.error(`Error updating scene status for ${sceneId}:`, error);
      return false;
    }
  }, [workflowManager]);
  
  // Create an MCP operation based on workflow state
  const createMCPOperation = useCallback((
    operation: string, 
    params: Record<string, any> = {}
  ): Record<string, any> | null => {
    if (!workflowManager) return null;
    return workflowManager.createMCPOperation(operation, params);
  }, [workflowManager]);
  
  return {
    workflowState,
    currentStage,
    isLoading,
    startWorkflow,
    updateStage,
    completeWorkflow,
    updateSceneStatus,
    createMCPOperation,
    project
  };
}
