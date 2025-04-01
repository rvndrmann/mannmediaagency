
import { supabase } from "@/integrations/supabase/client";
import { IntegrationService } from "../IntegrationService";
import { CanvasScene, WorkflowState } from "@/types/canvas";

export class VideoWorkflowService {
  private integrationService: IntegrationService;
  
  constructor(integrationService: IntegrationService) {
    this.integrationService = integrationService;
  }
  
  // Mock function to check MCP connection (removed from IntegrationService)
  private async checkMcpConnectionStatus(): Promise<boolean> {
    try {
      // Mock implementation
      return true;
    } catch (error) {
      console.error("Error checking MCP connection:", error);
      return false;
    }
  }
  
  async createWorkflow(projectId: string): Promise<WorkflowState | null> {
    try {
      // Check if MCP is connected
      const mcpConnected = await this.checkMcpConnectionStatus();
      
      if (!mcpConnected) {
        console.warn("MCP not connected, workflow creation may be limited");
      }
      
      // Use RPC for database operations to avoid TypeScript errors
      const { data, error } = await supabase.rpc('create_canvas_workflow', {
        p_project_id: projectId
      });
      
      if (error) throw error;
      
      return data as WorkflowState;
    } catch (error) {
      console.error("Error creating workflow:", error);
      return null;
    }
  }
  
  async getWorkflowStatus(projectId: string): Promise<WorkflowState | null> {
    try {
      // Use RPC for database operations to avoid TypeScript errors
      const { data, error } = await supabase.rpc('get_canvas_workflow', {
        p_project_id: projectId
      });
      
      if (error) throw error;
      
      return data as WorkflowState;
    } catch (error) {
      console.error("Error getting workflow status:", error);
      return null;
    }
  }
  
  // Get scenes for a project
  async getProjectScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_project_scenes', {
          p_project_id: projectId
        });
      
      if (error) throw error;
      
      // Convert database rows to CanvasScene objects
      const scenes: CanvasScene[] = data.map((scene: any) => ({
        id: scene.id,
        projectId: scene.project_id,
        title: scene.title,
        description: scene.description,
        script: scene.script,
        imagePrompt: scene.image_prompt,
        imageUrl: scene.image_url,
        videoUrl: scene.video_url,
        sceneOrder: scene.scene_order,
        createdAt: scene.created_at,
        updatedAt: scene.updated_at,
        voiceOverText: scene.voice_over_text,
        productImageUrl: scene.product_image_url,
        voiceOverUrl: scene.voice_over_url,
        backgroundMusicUrl: scene.background_music_url,
        duration: scene.duration
      }));
      
      return scenes;
    } catch (error) {
      console.error("Error fetching project scenes:", error);
      return [];
    }
  }
  
  async updateWorkflowStatus(projectId: string, status: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_canvas_workflow_status', {
        p_project_id: projectId,
        p_status: status
      });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error updating workflow status:", error);
      return false;
    }
  }
  
  async completeWorkflowStage(projectId: string, stage: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('complete_canvas_workflow_stage', {
        p_project_id: projectId,
        p_stage: stage
      });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error completing workflow stage:", error);
      return false;
    }
  }
  
  async setWorkflowError(projectId: string, errorMessage: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('set_canvas_workflow_error', {
        p_project_id: projectId,
        p_error_message: errorMessage
      });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error setting workflow error:", error);
      return false;
    }
  }
}
