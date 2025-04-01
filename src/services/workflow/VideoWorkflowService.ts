
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { CanvasScene } from '@/types/canvas';
import { toast } from 'sonner';

export interface WorkflowStatus {
  id: string;
  status: string;
  progress: number;
  completed_steps: number;
  total_steps: number;
  created_at: string;
  updated_at: string;
  current_step: string;
  error?: string;
}

export class VideoWorkflowService {
  private static instance: VideoWorkflowService;
  
  private constructor() {}
  
  public static getInstance(): VideoWorkflowService {
    if (!VideoWorkflowService.instance) {
      VideoWorkflowService.instance = new VideoWorkflowService();
    }
    return VideoWorkflowService.instance;
  }

  async createWorkflow(projectId: string, userId: string): Promise<WorkflowStatus | null> {
    try {
      // Import the IntegrationService here to avoid circular dependencies
      const { IntegrationService } = await import('../integration/IntegrationService');
      const integrationService = IntegrationService.getInstance();
      
      // Check if MCP is connected
      const isMcpConnected = integrationService.checkMcpConnection(projectId);
      if (!isMcpConnected) {
        toast.error('MCP not connected. Please connect MCP first.');
        return null;
      }
      
      const workflowId = uuidv4();
      
      const { data, error } = await supabase
        .from('video_workflows')
        .insert({
          id: workflowId,
          project_id: projectId,
          user_id: userId,
          status: 'created',
          progress: 0,
          completed_steps: 0,
          total_steps: 0
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating workflow:', error);
        throw error;
      }
      
      return data as WorkflowStatus;
    } catch (error) {
      console.error('Error in createWorkflow:', error);
      return null;
    }
  }
  
  async startWorkflow(workflowId: string, projectId: string): Promise<boolean> {
    try {
      // Import the IntegrationService here to avoid circular dependencies
      const { IntegrationService } = await import('../integration/IntegrationService');
      const integrationService = IntegrationService.getInstance();
      
      // Get scenes for the project
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (scenesError) {
        console.error('Error fetching scenes:', scenesError);
        return false;
      }
      
      // Start the workflow
      const { error } = await supabase
        .from('video_workflows')
        .update({
          status: 'processing',
          total_steps: scenes.length,
          current_step: 'Initializing workflow'
        })
        .eq('id', workflowId);
      
      if (error) {
        console.error('Error updating workflow:', error);
        return false;
      }
      
      // Process each scene
      for (let i = 0; i < scenes.length; i++) {
        const result = await this.processScene(scenes[i], workflowId, i + 1, scenes.length);
        if (!result) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in startWorkflow:', error);
      return false;
    }
  }
  
  async processScene(scene: CanvasScene, workflowId: string, stepNumber: number, totalSteps: number): Promise<boolean> {
    try {
      // Import the IntegrationService here to avoid circular dependencies
      const { IntegrationService } = await import('../integration/IntegrationService');
      const integrationService = IntegrationService.getInstance();
      
      // Update workflow status
      const { error } = await supabase
        .from('video_workflows')
        .update({
          current_step: `Processing scene ${stepNumber} of ${totalSteps}`,
          completed_steps: stepNumber - 1,
          progress: Math.floor(((stepNumber - 1) / totalSteps) * 100)
        })
        .eq('id', workflowId);
      
      if (error) {
        console.error('Error updating workflow:', error);
        return false;
      }
      
      // Process the scene (placeholder for actual processing)
      const updatedScene = {
        id: scene.id,
        project_id: scene.project_id,
        title: scene.title,
        description: scene.description,
        scene_order: scene.scene_order,
        image_url: scene.image_url,
        image_prompt: scene.image_prompt,
        script: scene.script,
        video_url: scene.video_url,
        voice_over_url: scene.voice_over_url,
        voice_over_text: scene.voice_over_text,
        background_music_url: scene.background_music_url,
        duration: scene.duration,
        product_image_url: scene.product_image_url,
        created_at: scene.created_at,
        updated_at: new Date().toISOString()
      };
      
      // Update the scene
      const { error: updateError } = await supabase
        .from('canvas_scenes')
        .update(updatedScene)
        .eq('id', scene.id);
      
      if (updateError) {
        console.error('Error updating scene:', updateError);
        return false;
      }
      
      // Update workflow progress
      const { error: progressError } = await supabase
        .from('video_workflows')
        .update({
          completed_steps: stepNumber,
          progress: Math.floor((stepNumber / totalSteps) * 100)
        })
        .eq('id', workflowId);
      
      if (progressError) {
        console.error('Error updating workflow progress:', progressError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in processScene:', error);
      return false;
    }
  }
  
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
    try {
      const { data, error } = await supabase
        .from('video_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();
      
      if (error) {
        console.error('Error getting workflow status:', error);
        return null;
      }
      
      return data as WorkflowStatus;
    } catch (error) {
      console.error('Error in getWorkflowStatus:', error);
      return null;
    }
  }
}

export const videoWorkflowService = VideoWorkflowService.getInstance();
