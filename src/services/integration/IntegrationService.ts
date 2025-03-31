
import { CanvasService } from "../canvas/CanvasService";
import { MCPService } from "../mcp/MCPService";
import { VideoWorkflowService } from "../workflow/VideoWorkflowService";
import { WorkflowStage, WorkflowState } from "@/types/canvas";

/**
 * Integration service that coordinates between different service layers
 */
export class IntegrationService {
  private static instance: IntegrationService;
  private canvasService: CanvasService;
  private videoWorkflowService: VideoWorkflowService;
  
  private constructor() {
    this.canvasService = CanvasService.getInstance();
    this.videoWorkflowService = VideoWorkflowService.getInstance();
  }
  
  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }
  
  /**
   * Initialize MCP for a Canvas project
   */
  async initMcpForProject(projectId: string): Promise<boolean> {
    try {
      // Get project details
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        console.error("Project not found");
        return false;
      }
      
      // Check if there's an existing connection
      const connection = MCPService.getConnectionForProject(projectId);
      if (connection && connection.connected) {
        return true;
      }
      
      // Create a new connection
      const newConnection = await MCPService.createDefaultConnection(projectId);
      return !!newConnection && !!newConnection.connected;
    } catch (error) {
      console.error("Error initializing MCP for project:", error);
      return false;
    }
  }
  
  /**
   * Process a scene through the entire pipeline (description → prompt → image → video)
   */
  async processScenePipeline(
    sceneId: string, 
    options: { 
      userId: string;
      generateDescription?: boolean;
      generateImagePrompt?: boolean;
      generateImage?: boolean;
      generateVideo?: boolean;
      aspectRatio?: string;
      imageVersion?: string;
    }
  ): Promise<boolean> {
    try {
      // Get scene details
      const scenes = await this.canvasService.getScenes(options.userId);
      const scene = scenes.find(s => s.id === sceneId);
      
      if (!scene) {
        console.error("Scene not found");
        return false;
      }
      
      try {
        // Initialize MCP
        await this.initMcpForProject(scene.projectId);
        
        // Generate description if requested
        if (options.generateDescription) {
          console.log("Generating description");
          const success = await this.canvasService.updateSceneDescription(sceneId);
          if (!success) {
            throw new Error("Failed to generate description");
          }
        }
        
        // Generate image prompt if requested
        if (options.generateImagePrompt) {
          console.log("Generating image prompt");
          const success = await this.canvasService.updateImagePrompt(sceneId);
          if (!success) {
            throw new Error("Failed to generate image prompt");
          }
        }
        
        // Generate image if requested
        if (options.generateImage) {
          console.log("Generating image");
          const success = await this.canvasService.generateImage({
            sceneId,
            version: options.imageVersion
          });
          if (!success) {
            throw new Error("Failed to generate image");
          }
        }
        
        // Generate video if requested
        if (options.generateVideo) {
          console.log("Generating video");
          const success = await this.canvasService.generateVideo({
            sceneId,
            aspectRatio: options.aspectRatio
          });
          if (!success) {
            throw new Error("Failed to generate video");
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error in process:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in processScenePipeline:", error);
      return false;
    }
  }
  
  /**
   * Start the automated multi-agent video workflow
   */
  async startVideoWorkflow(projectId: string, userId: string): Promise<WorkflowState | null> {
    return this.videoWorkflowService.startWorkflow(projectId, userId);
  }
  
  /**
   * Get the current workflow state for a project
   */
  async getWorkflowState(projectId: string): Promise<WorkflowState | null> {
    try {
      const { data, error } = await this.canvasService.supabase
        .from('canvas_workflows')
        .select('*')
        .eq('project_id', projectId)
        .single();
        
      if (error) {
        console.error("Error getting workflow state:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error getting workflow state:", error);
      return null;
    }
  }
  
  /**
   * Retry a workflow from a specific stage
   */
  async retryWorkflowFromStage(projectId: string, stage: WorkflowStage, userId: string): Promise<boolean> {
    return this.videoWorkflowService.retryWorkflowFromStage(projectId, stage, userId);
  }
  
  /**
   * Clean up resources when user leaves a project
   */
  async cleanupProjectResources(projectId: string): Promise<void> {
    try {
      // Close MCP connection for this project
      MCPService.closeConnection(projectId);
    } catch (error) {
      console.error("Error cleaning up project resources:", error);
    }
  }
}
