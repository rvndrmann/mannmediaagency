
import { supabase } from '@/integrations/supabase/client';
import { MCPService } from './MCPService';

export class IntegrationService {
  private static instance: IntegrationService;
  private mcpService: MCPService;
  
  private constructor() {
    // Initialize with a new instance of MCPService
    this.mcpService = new MCPService();
  }
  
  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  async connectToMcpServer(url: string, projectId: string): Promise<boolean> {
    try {
      return await this.mcpService.connect(url, projectId);
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      return false;
    }
  }
  
  async initMcpForProject(projectId: string): Promise<boolean> {
    try {
      const mcpUrl = process.env.REACT_APP_MCP_URL || 'https://api.mcp-server.com';
      return await this.connectToMcpServer(mcpUrl, projectId);
    } catch (error) {
      console.error('Error initializing MCP for project:', error);
      return false;
    }
  }

  getMcpConnectionUrlForProject(projectId: string): string | null {
    return this.mcpService.getUrl(projectId);
  }

  async getWorkflowState(projectId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_workflow_state', { p_project_id: projectId });
        
      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting workflow state:', error);
      return null;
    }
  }
  
  async startVideoWorkflow(projectId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('start_video_workflow', { 
          p_project_id: projectId 
        });
        
      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('Error starting video workflow:', error);
      return false;
    }
  }
  
  async retryWorkflowFromStage(projectId: string, stage: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('retry_workflow_from_stage', { 
          p_project_id: projectId,
          p_stage: stage 
        });
        
      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('Error retrying workflow:', error);
      return false;
    }
  }
}
