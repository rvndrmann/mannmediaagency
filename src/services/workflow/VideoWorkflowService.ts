
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, WorkflowState } from '@/types/canvas';
import { WorkflowResult, VideoWorkflowOptions } from './types';

export class VideoWorkflowService {
  private static instance: VideoWorkflowService;
  
  private constructor() {}
  
  public static getInstance(): VideoWorkflowService {
    if (!VideoWorkflowService.instance) {
      VideoWorkflowService.instance = new VideoWorkflowService();
    }
    return VideoWorkflowService.instance;
  }
  
  public async startVideoWorkflow(options: VideoWorkflowOptions): Promise<WorkflowResult> {
    try {
      // Create a workflow record
      const { data, error } = await supabase
        .from('workflow_states')
        .insert([{
          projectId: options.projectId,
          status: 'pending',
          currentStage: 'initialize',
          createdAt: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Return success
      return {
        success: true,
        message: 'Video workflow started',
        data: { workflowId: data.id }
      };
    } catch (error) {
      console.error("Error starting video workflow:", error);
      return {
        success: false,
        message: "Failed to start video workflow",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  public async getWorkflowState(projectId: string): Promise<WorkflowState | null> {
    try {
      // Get the latest workflow for this project
      const { data, error } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      
      return data as WorkflowState;
    } catch (error) {
      console.error("Error getting workflow state:", error);
      return null;
    }
  }
}
