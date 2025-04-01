
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for handling various integrations and connections
 */
export class IntegrationService {
  private static instance: IntegrationService;
  
  private constructor() {}
  
  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }
  
  /**
   * Check if MCP is connected for a specific project
   */
  async checkMcpConnection(projectId: string): Promise<boolean> {
    try {
      if (!projectId) {
        return false;
      }
      
      const { data, error } = await supabase
        .from('mcp_connections')
        .select('is_active, last_connected_at')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('last_connected_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      // Check if the connection was active in the last 10 minutes
      const lastConnected = new Date(data.last_connected_at);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      return data.is_active && lastConnected > tenMinutesAgo;
    } catch (error) {
      console.error('Error checking MCP connection:', error);
      return false;
    }
  }
  
  /**
   * Update canvas workflow using RPC instead of direct table access
   */
  async updateCanvasWorkflow(projectId: string, data: any): Promise<boolean> {
    try {
      const { data: result, error } = await supabase.rpc('update_canvas_workflow', {
        p_project_id: projectId,
        p_workflow_data: data
      });
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error updating canvas workflow:', error);
      return false;
    }
  }
  
  /**
   * Get canvas workflow for a project using RPC
   */
  async getCanvasWorkflow(projectId: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_canvas_workflow', {
        p_project_id: projectId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting canvas workflow:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const integrationService = IntegrationService.getInstance();
