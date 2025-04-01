
import { MCPService } from './MCPService';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowState } from '@/types/canvas'; 

export class IntegrationService {
  private static instance: IntegrationService;
  private mcpService: MCPService;
  
  private constructor() {
    this.mcpService = MCPService.getInstance();
  }
  
  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }
  
  // MCP Connection methods
  async connectToMCPServer(url: string, projectId: string): Promise<boolean> {
    return this.mcpService.connectToServer(url, projectId);
  }
  
  getMCPConnectionUrl(projectId: string): string | null {
    return this.mcpService.getConnectionUrl(projectId);
  }
  
  // Workflow methods
  async getWorkflowState(projectId: string): Promise<WorkflowState | null> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('get_workflow_state', {
        p_project_id: projectId
      });
      
      if (error) {
        console.error('Error fetching workflow state:', error);
        return null;
      }
      
      return data as WorkflowState;
    } catch (error) {
      console.error('Error in getWorkflowState:', error);
      return null;
    }
  }
  
  async startVideoWorkflow(projectId: string): Promise<boolean> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('start_video_workflow', {
        p_project_id: projectId
      });
      
      if (error) {
        console.error('Error starting video workflow:', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      console.error('Error in startVideoWorkflow:', error);
      return false;
    }
  }
  
  async retryWorkflowFromStage(projectId: string, stageName: string): Promise<boolean> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('retry_workflow_from_stage', {
        p_project_id: projectId,
        p_stage_name: stageName
      });
      
      if (error) {
        console.error('Error retrying workflow stage:', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      console.error('Error in retryWorkflowFromStage:', error);
      return false;
    }
  }
}
