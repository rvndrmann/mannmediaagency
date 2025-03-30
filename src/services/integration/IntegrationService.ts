
import { CanvasService } from "../canvas/CanvasService";
import { MCPService } from "../mcp/MCPService";
import { TracingService } from "../tracing/TracingService";

/**
 * Integration service that coordinates between different service layers
 */
export class IntegrationService {
  private static instance: IntegrationService;
  private mcpService: MCPService;
  private canvasService: CanvasService;
  private tracingService: TracingService;
  
  private constructor() {
    this.mcpService = MCPService.getInstance();
    this.canvasService = CanvasService.getInstance();
    this.tracingService = TracingService.getInstance();
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
      const connection = await this.mcpService.getConnectionForProject(projectId);
      if (connection && connection.isConnected()) {
        return true;
      }
      
      // Create a new connection
      const newConnection = await this.mcpService.createDefaultConnection(projectId);
      return newConnection !== null && newConnection.isConnected();
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
      const scene = await this.canvasService.getScene(sceneId);
      if (!scene) {
        console.error("Scene not found");
        return false;
      }
      
      // Start trace
      const traceId = this.tracingService.startTrace({
        userId: options.userId,
        agentType: 'canvas',
        projectId: scene.project_id
      });
      
      try {
        // Initialize MCP
        await this.initMcpForProject(scene.project_id);
        
        // Generate description if requested
        if (options.generateDescription) {
          this.tracingService.addEvent('generate_description_start', { sceneId });
          const success = await this.canvasService.updateSceneDescription(sceneId);
          this.tracingService.addEvent('generate_description_end', { 
            sceneId,
            success
          });
          
          if (!success) {
            throw new Error("Failed to generate description");
          }
        }
        
        // Generate image prompt if requested
        if (options.generateImagePrompt) {
          this.tracingService.addEvent('generate_image_prompt_start', { sceneId });
          const success = await this.canvasService.updateImagePrompt(sceneId);
          this.tracingService.addEvent('generate_image_prompt_end', { 
            sceneId,
            success
          });
          
          if (!success) {
            throw new Error("Failed to generate image prompt");
          }
        }
        
        // Generate image if requested
        if (options.generateImage) {
          this.tracingService.addEvent('generate_image_start', { sceneId });
          const success = await this.canvasService.generateImage({
            sceneId,
            version: options.imageVersion
          });
          this.tracingService.addEvent('generate_image_end', { 
            sceneId,
            success
          });
          
          if (!success) {
            throw new Error("Failed to generate image");
          }
        }
        
        // Generate video if requested
        if (options.generateVideo) {
          this.tracingService.addEvent('generate_video_start', { sceneId });
          const success = await this.canvasService.generateVideo({
            sceneId,
            aspectRatio: options.aspectRatio
          });
          this.tracingService.addEvent('generate_video_end', { 
            sceneId,
            success
          });
          
          if (!success) {
            throw new Error("Failed to generate video");
          }
        }
        
        // End trace successfully
        await this.tracingService.endTrace({
          success: true,
          userMessage: `Process scene pipeline for scene ${sceneId}`,
          assistantResponse: "Scene pipeline processing completed successfully",
          toolCalls: (options.generateDescription ? 1 : 0) + 
                     (options.generateImagePrompt ? 1 : 0) + 
                     (options.generateImage ? 1 : 0) + 
                     (options.generateVideo ? 1 : 0)
        });
        
        return true;
      } catch (error) {
        // End trace with error
        await this.tracingService.endTrace({
          success: false,
          userMessage: `Process scene pipeline for scene ${sceneId}`,
          assistantResponse: `Error: ${error instanceof Error ? error.message : String(error)}`,
        });
        
        throw error;
      }
    } catch (error) {
      console.error("Error in processScenePipeline:", error);
      return false;
    }
  }
  
  /**
   * Clean up resources when user leaves a project
   */
  async cleanupProjectResources(projectId: string): Promise<void> {
    try {
      // Close MCP connection for this project
      await this.mcpService.closeConnection(projectId);
    } catch (error) {
      console.error("Error cleaning up project resources:", error);
    }
  }
}
