import { supabase } from "@/integrations/supabase/client";

export class VideoWorkflowService {
  private static instance: VideoWorkflowService;
  private supabase = supabase;
  
  private constructor() {}
  
  public static getInstance(): VideoWorkflowService {
    if (!VideoWorkflowService.instance) {
      VideoWorkflowService.instance = new VideoWorkflowService();
    }
    return VideoWorkflowService.instance;
  }
  
  async initializeProject(projectId: string): Promise<boolean> {
    try {
      const integrationService = IntegrationService.getInstance();
      const mcpInitialized = await integrationService.initMcpForProject(projectId);
      
      if (!mcpInitialized) {
        console.error("Failed to initialize MCP for project");
        return false;
      }
      
      const project = await this.getProjectById(projectId);
      if (!project) {
        console.error("Project not found");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error initializing project:", error);
      return false;
    }
  }
  
  async getProjectById(projectId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (error) {
        console.error("Error fetching project:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error getting project by ID:", error);
      return null;
    }
  }
  
  async createWorkflow(projectId: string): Promise<boolean> {
    try {
      const existingWorkflow = await this.getWorkflowState(projectId);
      if (existingWorkflow) {
        console.warn("Workflow already exists for this project");
        return true;
      }
      
      const integrationService = IntegrationService.getInstance();
      await integrationService.initMcpForProject(projectId);
      
      const workflowStarted = await integrationService.startVideoWorkflow(projectId);
      if (!workflowStarted) {
        console.error("Failed to start video workflow");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error creating workflow:", error);
      return false;
    }
  }
  
  async getWorkflowState(projectId: string): Promise<any> {
    try {
      const integrationService = IntegrationService.getInstance();
      return await integrationService.getWorkflowState(projectId);
    } catch (error) {
      console.error("Error getting workflow state:", error);
      return null;
    }
  }
  
  async processScene(sceneId: string): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error } = await this.supabase
        .from('canvas_scenes')
        .update({ status: 'processing' })
        .eq('id', sceneId);
        
      if (error) {
        console.error("Failed to update scene status:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error processing scene:", error);
      return false;
    }
  }
  
  async finalizeVideo(projectId: string, videoUrl: string): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updated = await this.updateProjectWithFinalVideo(projectId, videoUrl);
      if (!updated) {
        console.error("Failed to update project with final video");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error finalizing video:", error);
      return false;
    }
  }
  
  async updateSceneData(sceneId: string, data: Partial<any>): Promise<boolean> {
    try {
      const { status, ...safeData } = data;
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(safeData)
        .eq('id', sceneId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error updating scene data:", error);
      return false;
    }
  }
  
  private async updateProjectWithFinalVideo(projectId: string, videoUrl: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('canvas_projects')
        .update({ 
          final_video_url: videoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
        
      if (error) {
        console.error("Failed to update project with final video URL:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error updating project with final video:", error);
      return false;
    }
  }
}
