import { CanvasService } from "../canvas/CanvasService";
import { MCPService } from "../mcp/MCPService";
import { IntegrationService } from "../integration/IntegrationService";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowRPC } from "./WorkflowRPC";
import { 
  CanvasScene, 
  WorkflowStage, 
  WorkflowState,
  VideoGenerationParams
} from "@/types/canvas";

/**
 * Service for managing the video creation workflow
 */
export class VideoWorkflowService {
  private static instance: VideoWorkflowService;
  private canvasService: CanvasService;
  private integrationService: IntegrationService;
  private workflowRPC: WorkflowRPC;
  
  private constructor() {
    this.canvasService = CanvasService.getInstance();
    this.integrationService = IntegrationService.getInstance();
    this.workflowRPC = WorkflowRPC.getInstance();
  }
  
  static getInstance(): VideoWorkflowService {
    if (!VideoWorkflowService.instance) {
      VideoWorkflowService.instance = new VideoWorkflowService();
    }
    return VideoWorkflowService.instance;
  }
  
  /**
   * Start a new video workflow for a project
   */
  async startWorkflow(projectId: string, userId: string): Promise<WorkflowState | null> {
    try {
      // Initialize MCP for this project
      const mcpInitialized = await this.integrationService.initMcpForProject(projectId);
      if (!mcpInitialized) {
        console.error("Failed to initialize MCP for workflow");
        return null;
      }
      
      // Create a new workflow state
      const workflowState: WorkflowState = {
        projectId,
        currentStage: 'script_generation',
        completedStages: [],
        sceneStatuses: {},
        startedAt: new Date().toISOString(),
        status: 'in_progress'
      };
      
      // Create the workflow using RPC
      const data = await this.workflowRPC.createWorkflow(workflowState);
      
      if (!data) {
        console.error("Error creating workflow");
        return null;
      }
      
      // Process the first stage (script generation)
      await this.processWorkflowStage(data, userId);
      
      return data;
    } catch (error) {
      console.error("Error starting workflow:", error);
      return null;
    }
  }
  
  /**
   * Process a workflow stage
   */
  async processWorkflowStage(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId, currentStage } = workflow;
      
      // Initialize MCP if not already initialized
      await this.integrationService.initMcpForProject(projectId);
      
      switch (currentStage) {
        case 'script_generation':
          return await this.processScriptGeneration(workflow, userId);
          
        case 'scene_splitting':
          return await this.processSceneSplitting(workflow, userId);
          
        case 'image_generation':
          return await this.processImageGeneration(workflow, userId);
          
        case 'scene_description':
          return await this.processSceneDescription(workflow, userId);
          
        case 'video_generation':
          return await this.processVideoGeneration(workflow, userId);
          
        case 'final_assembly':
          return await this.processFinalAssembly(workflow, userId);
          
        default:
          console.error(`Unknown workflow stage: ${currentStage}`);
          return false;
      }
    } catch (error) {
      console.error(`Error processing workflow stage ${workflow.currentStage}:`, error);
      
      // Update workflow status to failed
      await this.workflowRPC.updateWorkflowStatus(workflow.projectId, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }
  
  /**
   * Process script generation stage
   */
  private async processScriptGeneration(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId } = workflow;
      
      console.log(`Processing script generation for project ${projectId}`);
      
      // Get project details
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Check if the project already has a full script
      if (project.fullScript) {
        console.log("Project already has a full script, moving to scene splitting");
        await this.moveToNextStage(projectId, 'script_generation', 'scene_splitting');
        return true;
      }
      
      // Use the script agent to generate a full script
      const scriptGenerated = await this.generateProjectScript(projectId, userId);
      
      if (scriptGenerated) {
        // Move to the next stage
        await this.moveToNextStage(projectId, 'script_generation', 'scene_splitting');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in script generation stage:", error);
      throw error;
    }
  }
  
  /**
   * Generate a script for a project using the script agent
   */
  private async generateProjectScript(projectId: string, userId: string): Promise<boolean> {
    try {
      // Get project details
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Call the script agent to generate a script
      const { data, error } = await supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: `Generate a complete script for a video titled "${project.title}". The script should be engaging, clear, and structured for a video production. Please make it concise but comprehensive enough to cover the topic well.`,
          agentType: "script",
          userId,
          contextData: {
            projectId,
            projectTitle: project.title,
            forceScriptGeneration: true
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Extract the script from the response
      const script = data?.completion || "";
      
      if (!script) {
        throw new Error("Failed to generate script");
      }
      
      // Update the project with the full script
      const { error: updateError } = await supabase
        .from('canvas_projects')
        .update({ full_script: script })
        .eq('id', projectId);
        
      if (updateError) {
        throw updateError;
      }
      
      return true;
    } catch (error) {
      console.error("Error generating project script:", error);
      return false;
    }
  }
  
  /**
   * Process scene splitting stage
   */
  private async processSceneSplitting(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId } = workflow;
      
      console.log(`Processing scene splitting for project ${projectId}`);
      
      // Get project details
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Check if the project has a full script
      if (!project.fullScript) {
        throw new Error("Project does not have a full script");
      }
      
      // Get existing scenes
      const scenes = await this.canvasService.getScenes(projectId);
      
      // If project already has scenes, move to the next stage
      if (scenes.length > 0) {
        console.log(`Project already has ${scenes.length} scenes, moving to image generation`);
        
        // Update the workflow's scene statuses with existing scenes
        const sceneStatuses: Record<string, any> = {};
        scenes.forEach(scene => {
          sceneStatuses[scene.id] = {
            sceneId: scene.id,
            scriptComplete: true,
            imageComplete: !!scene.imageUrl,
            descriptionComplete: !!scene.description,
            videoComplete: !!scene.videoUrl
          };
        });
        
        await this.updateWorkflowSceneStatuses(projectId, sceneStatuses);
        await this.moveToNextStage(projectId, 'scene_splitting', 'image_generation');
        return true;
      }
      
      // Split the script into scenes
      const scriptSplitResult = await this.splitScriptIntoScenes(projectId, project.fullScript, userId);
      
      if (scriptSplitResult) {
        // Get the newly created scenes
        const newScenes = await this.canvasService.getScenes(projectId);
        
        // Update the workflow's scene statuses
        const sceneStatuses: Record<string, any> = {};
        newScenes.forEach(scene => {
          sceneStatuses[scene.id] = {
            sceneId: scene.id,
            scriptComplete: true,
            imageComplete: false,
            descriptionComplete: false,
            videoComplete: false
          };
        });
        
        await this.updateWorkflowSceneStatuses(projectId, sceneStatuses);
        
        // Move to the next stage
        await this.moveToNextStage(projectId, 'scene_splitting', 'image_generation');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in scene splitting stage:", error);
      throw error;
    }
  }
  
  /**
   * Split a script into scenes
   */
  private async splitScriptIntoScenes(projectId: string, script: string, userId: string): Promise<boolean> {
    try {
      // Split the script using AI
      const { data, error } = await supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: `Split the following script into logical scenes, where each scene has up to 70 words. Make sure to cut at the end of complete sentences. For each scene, provide both the script text and a voice-over text that can be used for text-to-speech.\n\nScript:\n${script}`,
          agentType: "scene",
          userId,
          contextData: {
            projectId,
            sceneSplitting: true,
            maxWordsPerScene: 70
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Process the response to create scenes
      const response = data?.completion || "";
      
      if (!response) {
        throw new Error("Failed to split script into scenes");
      }
      
      // Parse the scenes from the response
      // This is simplified and would need more robust parsing in a real implementation
      const sceneMatches = response.match(/Scene \d+:([\s\S]*?)(?=Scene \d+:|$)/g);
      
      if (!sceneMatches || sceneMatches.length === 0) {
        throw new Error("Failed to parse scenes from response");
      }
      
      // Create scenes in the database
      for (let i = 0; i < sceneMatches.length; i++) {
        const sceneText = sceneMatches[i];
        
        // Extract the script and voice-over text
        const scriptMatch = sceneText.match(/Script:([\s\S]*?)(?=Voice-over:|$)/i);
        const voiceOverMatch = sceneText.match(/Voice-over:([\s\S]*?)(?=\n\n|$)/i);
        
        const sceneScript = scriptMatch ? scriptMatch[1].trim() : "";
        const voiceOverText = voiceOverMatch ? voiceOverMatch[1].trim() : sceneScript;
        
        // Create the scene
        await this.canvasService.createScene(projectId, {
          title: `Scene ${i + 1}`,
          script: sceneScript,
          sceneOrder: i,
          voiceOverText: voiceOverText
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error splitting script into scenes:", error);
      return false;
    }
  }
  
  /**
   * Process image generation stage
   */
  private async processImageGeneration(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId, sceneStatuses } = workflow;
      
      console.log(`Processing image generation for project ${projectId}`);
      
      // Get scenes
      const scenes = await this.canvasService.getScenes(projectId);
      if (scenes.length === 0) {
        throw new Error("Project has no scenes");
      }
      
      // Check if all scenes already have images
      const allScenesHaveImages = scenes.every(scene => !!scene.imageUrl);
      if (allScenesHaveImages) {
        console.log("All scenes already have images, moving to scene description");
        await this.moveToNextStage(projectId, 'image_generation', 'scene_description');
        return true;
      }
      
      // Process each scene that doesn't have an image
      let allSuccessful = true;
      for (const scene of scenes) {
        // Skip scenes that already have images
        if (scene.imageUrl) {
          // Make sure to update the scene status
          if (sceneStatuses[scene.id]) {
            sceneStatuses[scene.id].imageComplete = true;
          }
          continue;
        }
        
        // Generate an image prompt if needed
        if (!scene.imagePrompt) {
          const promptGenerated = await this.canvasService.updateImagePrompt(scene.id);
          if (!promptGenerated) {
            console.error(`Failed to generate image prompt for scene ${scene.id}`);
            allSuccessful = false;
            continue;
          }
        }
        
        // Generate image
        const imageGenerated = await this.canvasService.generateImage({
          sceneId: scene.id,
          version: "v2" // Use ProductShot v2
        });
        
        if (!imageGenerated) {
          console.error(`Failed to generate image for scene ${scene.id}`);
          allSuccessful = false;
          continue;
        }
        
        // Update scene status
        if (sceneStatuses[scene.id]) {
          sceneStatuses[scene.id].imageComplete = true;
        }
      }
      
      // Update workflow scene statuses
      await this.updateWorkflowSceneStatuses(projectId, sceneStatuses);
      
      // If all images were generated successfully, move to the next stage
      if (allSuccessful) {
        await this.moveToNextStage(projectId, 'image_generation', 'scene_description');
      }
      
      return allSuccessful;
    } catch (error) {
      console.error("Error in image generation stage:", error);
      throw error;
    }
  }
  
  /**
   * Process scene description stage
   */
  private async processSceneDescription(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId, sceneStatuses } = workflow;
      
      console.log(`Processing scene description for project ${projectId}`);
      
      // Get scenes
      const scenes = await this.canvasService.getScenes(projectId);
      if (scenes.length === 0) {
        throw new Error("Project has no scenes");
      }
      
      // Check if all scenes already have descriptions
      const allScenesHaveDescriptions = scenes.every(scene => !!scene.description);
      if (allScenesHaveDescriptions) {
        console.log("All scenes already have descriptions, moving to video generation");
        await this.moveToNextStage(projectId, 'scene_description', 'video_generation');
        return true;
      }
      
      // Process each scene that doesn't have a description
      let allSuccessful = true;
      for (const scene of scenes) {
        // Skip scenes that already have descriptions
        if (scene.description) {
          // Make sure to update the scene status
          if (sceneStatuses[scene.id]) {
            sceneStatuses[scene.id].descriptionComplete = true;
          }
          continue;
        }
        
        // Skip scenes that don't have images
        if (!scene.imageUrl) {
          console.warn(`Scene ${scene.id} does not have an image, skipping description generation`);
          continue;
        }
        
        // Generate scene description
        const descriptionGenerated = await this.canvasService.updateSceneDescription(scene.id);
        
        if (!descriptionGenerated) {
          console.error(`Failed to generate description for scene ${scene.id}`);
          allSuccessful = false;
          continue;
        }
        
        // Update scene status
        if (sceneStatuses[scene.id]) {
          sceneStatuses[scene.id].descriptionComplete = true;
        }
      }
      
      // Update workflow scene statuses
      await this.updateWorkflowSceneStatuses(projectId, sceneStatuses);
      
      // If all descriptions were generated successfully, move to the next stage
      if (allSuccessful) {
        await this.moveToNextStage(projectId, 'scene_description', 'video_generation');
      }
      
      return allSuccessful;
    } catch (error) {
      console.error("Error in scene description stage:", error);
      throw error;
    }
  }
  
  /**
   * Process video generation stage
   */
  private async processVideoGeneration(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId, sceneStatuses } = workflow;
      
      console.log(`Processing video generation for project ${projectId}`);
      
      // Get scenes
      const scenes = await this.canvasService.getScenes(projectId);
      if (scenes.length === 0) {
        throw new Error("Project has no scenes");
      }
      
      // Check if all scenes already have videos
      const allScenesHaveVideos = scenes.every(scene => !!scene.videoUrl);
      if (allScenesHaveVideos) {
        console.log("All scenes already have videos, moving to final assembly");
        await this.moveToNextStage(projectId, 'video_generation', 'final_assembly');
        return true;
      }
      
      // Process each scene that doesn't have a video
      let allSuccessful = true;
      for (const scene of scenes) {
        // Skip scenes that already have videos
        if (scene.videoUrl) {
          // Make sure to update the scene status
          if (sceneStatuses[scene.id]) {
            sceneStatuses[scene.id].videoComplete = true;
          }
          continue;
        }
        
        // Skip scenes that don't have images or descriptions
        if (!scene.imageUrl || !scene.description) {
          console.warn(`Scene ${scene.id} is missing image or description, skipping video generation`);
          continue;
        }
        
        // Generate video
        const params: VideoGenerationParams = {
          sceneId: scene.id,
          aspectRatio: "16:9" // Default aspect ratio
        };
        
        const videoGenerated = await this.canvasService.generateVideo(params);
        
        if (!videoGenerated) {
          console.error(`Failed to generate video for scene ${scene.id}`);
          allSuccessful = false;
          continue;
        }
        
        // Update scene status
        if (sceneStatuses[scene.id]) {
          sceneStatuses[scene.id].videoComplete = true;
        }
      }
      
      // Update workflow scene statuses
      await this.updateWorkflowSceneStatuses(projectId, sceneStatuses);
      
      // If all videos were generated successfully, move to the next stage
      if (allSuccessful) {
        await this.moveToNextStage(projectId, 'video_generation', 'final_assembly');
      }
      
      return allSuccessful;
    } catch (error) {
      console.error("Error in video generation stage:", error);
      throw error;
    }
  }
  
  /**
   * Process final assembly stage
   */
  private async processFinalAssembly(workflow: WorkflowState, userId: string): Promise<boolean> {
    try {
      const { projectId } = workflow;
      
      console.log(`Processing final assembly for project ${projectId}`);
      
      // Get scenes
      const scenes = await this.canvasService.getScenes(projectId);
      if (scenes.length === 0) {
        throw new Error("Project has no scenes");
      }
      
      // Check if all scenes have videos
      const allScenesHaveVideos = scenes.every(scene => !!scene.videoUrl);
      if (!allScenesHaveVideos) {
        console.warn("Not all scenes have videos, some scenes may be skipped in the final video");
      }
      
      // Filter scenes that have videos
      const scenesWithVideos = scenes.filter(scene => !!scene.videoUrl);
      if (scenesWithVideos.length === 0) {
        throw new Error("No scenes have videos, cannot assemble final video");
      }
      
      // Get project details
      const project = await this.canvasService.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Generate JSON structure for json2video API
      const json2videoPayload = this.createJson2VideoPayload(project, scenesWithVideos);
      
      // Call the json2video API
      const finalVideoResult = await this.generateFinalVideo(projectId, json2videoPayload);
      
      if (!finalVideoResult) {
        throw new Error("Failed to generate final video");
      }
      
      // Update workflow status to completed
      await this.updateWorkflowStatus(projectId, 'completed');
      
      return true;
    } catch (error) {
      console.error("Error in final assembly stage:", error);
      throw error;
    }
  }
  
  /**
   * Create the JSON payload for the json2video API
   */
  private createJson2VideoPayload(project: any, scenes: CanvasScene[]): any {
    // Create scenes array for json2video
    const videoScenes = scenes.map((scene, index) => {
      return {
        id: scene.id,
        video: scene.videoUrl,
        duration: scene.duration || 5, // Default duration of 5 seconds if not specified
        voiceOver: scene.voiceOverUrl || null,
        voiceOverText: scene.voiceOverText || scene.script || ""
      };
    });
    
    // Create the json2video payload
    return {
      projectName: project.title || "Auto-generated video",
      scenes: videoScenes,
      settings: {
        format: "mp4",
        resolution: "1080p",
        aspectRatio: "16:9",
        quality: "high"
      }
    };
  }
  
  /**
   * Generate the final video using the json2video API
   */
  private async generateFinalVideo(projectId: string, payload: any): Promise<boolean> {
    try {
      // Call the json2video API via edge function
      const { data, error } = await supabase.functions.invoke('json2video', {
        body: {
          projectId,
          payload
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Update the project with the final video URL
      if (data?.videoUrl) {
        const { error: updateError } = await supabase
          .from('canvas_projects')
          .update({ final_video_url: data.videoUrl })
          .eq('id', projectId);
          
        if (updateError) {
          throw updateError;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error generating final video:", error);
      return false;
    }
  }
  
  /**
   * Move workflow to the next stage
   */
  private async moveToNextStage(
    projectId: string, 
    currentStage: WorkflowStage, 
    nextStage: WorkflowStage
  ): Promise<void> {
    await this.workflowRPC.moveToNextStage(projectId, currentStage, nextStage);
  }
  
  /**
   * Update workflow status
   */
  private async updateWorkflowStatus(
    projectId: string, 
    status: 'in_progress' | 'completed' | 'failed',
    additionalData: any = {}
  ): Promise<void> {
    await this.workflowRPC.updateWorkflowStatus(projectId, status, additionalData);
  }
  
  /**
   * Update workflow scene statuses
   */
  private async updateWorkflowSceneStatuses(
    projectId: string,
    sceneStatuses: Record<string, any>
  ): Promise<void> {
    await this.workflowRPC.updateWorkflowSceneStatuses(projectId, sceneStatuses);
  }
  
  /**
   * Retry a workflow from a particular stage
   */
  async retryWorkflowFromStage(projectId: string, stage: WorkflowStage, userId: string): Promise<boolean> {
    try {
      // Reset workflow stage via RPC
      await this.workflowRPC.retryWorkflowFromStage(projectId, stage);
      
      // Get the updated workflow state
      const workflow = await this.workflowRPC.getWorkflowByProject(projectId);
      
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      
      // Process the stage
      return await this.processWorkflowStage(workflow, userId);
    } catch (error) {
      console.error("Error retrying workflow stage:", error);
      return false;
    }
  }
}
