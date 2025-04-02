import { useState, useCallback, useEffect } from 'react';
import { MCPServerService } from '../services/mcpService';
import { AgentSDKService } from '../services/agentSDKService';
import { VideoProject, VideoScene } from '../types/video-project';
import { AgentResponse, AgentContext } from '../types/agent-sdk';

interface UseAgentEnhancedVideoProjectProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
}

interface UseAgentEnhancedVideoProjectReturn {
  project: VideoProject | null;
  loading: boolean;
  error: Error | null;
  agentAnalysis: AgentResponse | null;
  createProject: (name: string, description?: string) => Promise<VideoProject>;
  getProject: (projectId: string) => Promise<VideoProject>;
  updateProject: (projectId: string, updates: Partial<VideoProject>) => Promise<VideoProject>;
  addScene: (projectId: string, name: string, description?: string) => Promise<VideoScene>;
  generateSceneAssets: (projectId: string, sceneId: string) => Promise<void>;
  compileVideo: (projectId: string, outputFormat?: 'mp4' | 'webm') => Promise<string>;
  analyzeProject: (projectId: string, context?: string) => Promise<AgentResponse>;
  optimizeScenes: (projectId: string) => Promise<AgentResponse>;
  enhanceScene: (projectId: string, sceneId: string) => Promise<AgentResponse>;
  suggestImprovements: (projectId: string, sceneId: string) => Promise<AgentResponse>;
}

export function useAgentEnhancedVideoProject({
  mcpService,
  agentSDK
}: UseAgentEnhancedVideoProjectProps): UseAgentEnhancedVideoProjectReturn {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agentAnalysis, setAgentAnalysis] = useState<AgentResponse | null>(null);

  const createProject = useCallback(async (name: string, description?: string): Promise<VideoProject> => {
    setLoading(true);
    setError(null);
    try {
      // Check if MCP service is connected
      if (!mcpService.isConnected()) {
        try {
          await mcpService.connect();
          console.log("Connected to MCP service");
        } catch (connErr) {
          console.error("Failed to connect to MCP service:", connErr);
          throw new Error("Could not connect to MCP service. Please try again.");
        }
      }
      
      const result = await mcpService.callTool('create_video_project', { name, description });
      if (!result.success) {
        throw new Error(result.error || 'Failed to create video project');
      }
      if (!result.data || !result.data.project) {
        throw new Error('Project data is missing from response');
      }
      
      setProject(result.data.project);
      return result.data.project;
    } catch (err) {
      console.error("Error creating project:", err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService]);

  const getProject = useCallback(async (projectId: string): Promise<VideoProject> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('get_video_project', { projectId });
      if (!result.success || !result.data.project) {
        throw new Error(result.error || 'Failed to get video project');
      }
      setProject(result.data.project);
      return result.data.project;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<VideoProject>): Promise<VideoProject> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('update_video_project', {
        projectId,
        ...updates
      });
      if (!result.success || !result.data.project) {
        throw new Error(result.error || 'Failed to update video project');
      }
      setProject(result.data.project);
      return result.data.project;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService]);

  const addScene = useCallback(async (projectId: string, name: string, description?: string): Promise<VideoScene> => {
    setLoading(true);
    setError(null);
    console.log(`[useAgentEnhancedVideoProject] addScene called:`, { projectId, name, description, currentScenes: project?.scenes?.length });
    try {
      const order = project?.scenes?.length || 0;
      console.log(`[useAgentEnhancedVideoProject] Calling mcpService.callTool('add_scene') with order: ${order}`);
      const result = await mcpService.callTool('add_scene', {
        projectId,
        name,
        description,
        order: order
      });
      console.log(`[useAgentEnhancedVideoProject] mcpService.callTool('add_scene') result:`, result);

      if (!result.success || !result.data.scene) {
        throw new Error(result.error || 'Failed to add scene or scene data missing from response');
      }
      // Update the project with the new scene
      if (project) {
        const updatedScenes = Array.isArray(project.scenes)
          ? [...project.scenes, result.data.scene]
          : [result.data.scene];
        
        console.log(`[useAgentEnhancedVideoProject] Updating project state with new scenes:`, updatedScenes);
        setProject({
          ...project,
          scenes: updatedScenes
        });
      } else {
        console.warn(`[useAgentEnhancedVideoProject] Project state was null when trying to add scene. Cannot update state.`);
      }
      
      return result.data.scene;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err ?? 'Unknown error in addScene'));
      console.error(`[useAgentEnhancedVideoProject] Error in addScene:`, error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService, project]);

  const analyzeProject = useCallback(async (projectId: string, context?: string): Promise<AgentResponse> => {
    setLoading(true);
    setError(null);
    try {
      // Ensure we have the latest project data
      if (!project) {
        await getProject(projectId).catch(err => {
          console.warn("Could not refresh project data before analysis:", err);
        });
      }
      
      const agentContext: AgentContext = {
        project: project || undefined,
        userInput: context
      };
      
      const analysis = await agentSDK.executeFunction('analyze_project_requirements', {
        projectId,
        context
      }, agentContext);
      
      setAgentAnalysis(analysis);
      return analysis;
    } catch (err) {
      console.error("Error analyzing project:", err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agentSDK, project, getProject]);

  const optimizeScenes = useCallback(async (projectId: string): Promise<AgentResponse> => {
    setLoading(true);
    setError(null);
    try {
      const agentContext: AgentContext = {
        project: project || undefined
      };
      
      return await agentSDK.executeFunction('optimize_scene_sequence', {
        projectId
      }, agentContext);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agentSDK, project]);

  const enhanceScene = useCallback(async (projectId: string, sceneId: string): Promise<AgentResponse> => {
    setLoading(true);
    setError(null);
    try {
      const scene = project?.scenes.find(s => s.id === sceneId);
      const agentContext: AgentContext = {
        project: project || undefined,
        scene: scene
      };
      
      return await agentSDK.executeFunction('enhance_scene_descriptions', {
        projectId,
        sceneId
      }, agentContext);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agentSDK, project]);

  const suggestImprovements = useCallback(async (projectId: string, sceneId: string): Promise<AgentResponse> => {
    setLoading(true);
    setError(null);
    try {
      const scene = project?.scenes.find(s => s.id === sceneId);
      const agentContext: AgentContext = {
        project: project || undefined,
        scene: scene
      };
      
      return await agentSDK.executeFunction('suggest_scene_improvements', {
        projectId,
        sceneId
      }, agentContext);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agentSDK, project]);

  const generateSceneAssets = useCallback(async (projectId: string, sceneId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    let currentStep = "initializing";
    
    try {
      // Step 1: Generate image prompt
      currentStep = "generating image prompt";
      console.log(`Starting ${currentStep} for scene ${sceneId}`);
      await mcpService.callTool('generate_image_prompt', { projectId, sceneId })
        .catch(err => {
          console.error(`Error ${currentStep}:`, err);
          throw new Error(`Failed while ${currentStep}: ${err.message || err}`);
        });
      
      // Step 2: Generate scene image
      currentStep = "generating scene image";
      console.log(`Starting ${currentStep} for scene ${sceneId}`);
      await mcpService.callTool('generate_scene_image', { projectId, sceneId })
        .catch(err => {
          console.error(`Error ${currentStep}:`, err);
          throw new Error(`Failed while ${currentStep}: ${err.message || err}`);
        });
      
      // Step 3: Generate scene script
      currentStep = "generating scene script";
      console.log(`Starting ${currentStep} for scene ${sceneId}`);
      await mcpService.callTool('generate_scene_script', { projectId, sceneId })
        .catch(err => {
          console.error(`Error ${currentStep}:`, err);
          throw new Error(`Failed while ${currentStep}: ${err.message || err}`);
        });
      
      // Step 4: Generate scene video
      currentStep = "generating scene video";
      console.log(`Starting ${currentStep} for scene ${sceneId}`);
      await mcpService.callTool('generate_scene_video', { projectId, sceneId })
        .catch(err => {
          console.error(`Error ${currentStep}:`, err);
          throw new Error(`Failed while ${currentStep}: ${err.message || err}`);
        });
      
      // Step 5: Refresh project data
      currentStep = "refreshing project data";
      console.log(`Starting ${currentStep} for scene ${sceneId}`);
      await getProject(projectId);
      console.log("Successfully generated all scene assets");
      
    } catch (err) {
      console.error(`Error in generateSceneAssets during ${currentStep}:`, err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService, getProject]);

  const compileVideo = useCallback(async (projectId: string, outputFormat: 'mp4' | 'webm' = 'mp4'): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('compile_video', { projectId, outputFormat });
      if (!result.success || !result.data.videoUrl) {
        throw new Error(result.error || 'Failed to compile video');
      }
      return result.data.videoUrl;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService]);

  return {
    project,
    loading,
    error,
    agentAnalysis,
    createProject,
    getProject,
    updateProject,
    addScene,
    generateSceneAssets,
    compileVideo,
    analyzeProject,
    optimizeScenes,
    enhanceScene,
    suggestImprovements
  };
}