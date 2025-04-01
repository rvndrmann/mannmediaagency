import { useState, useCallback } from 'react';
import { MCPServerService } from '../services/mcpService';
import { VideoProject, VideoScene, VideoProjectStatus, SceneStatus } from '../types/video-project';

interface UseVideoProjectProps {
  mcpService: MCPServerService;
}

interface UseVideoProjectReturn {
  project: VideoProject | null;
  loading: boolean;
  error: Error | null;
  createProject: (name: string, description?: string) => Promise<VideoProject>;
  getProject: (projectId: string) => Promise<VideoProject>;
  updateProject: (projectId: string, updates: Partial<VideoProject>) => Promise<VideoProject>;
  addScene: (projectId: string, name: string, description?: string) => Promise<VideoScene>;
  generateSceneAssets: (projectId: string, sceneId: string) => Promise<void>;
  compileVideo: (projectId: string, outputFormat?: 'mp4' | 'webm') => Promise<string>;
}

export function useVideoProject({ mcpService }: UseVideoProjectProps): UseVideoProjectReturn {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const createProject = useCallback(async (name: string, description?: string): Promise<VideoProject> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('create_video_project', { name, description });
      if (!result.success || !result.data.project) {
        throw new Error(result.error || 'Failed to create video project');
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
    try {
      const result = await mcpService.callTool('add_scene', {
        projectId,
        name,
        description,
        order: project?.scenes?.length || 0
      });
      if (!result.success || !result.data.scene) {
        throw new Error(result.error || 'Failed to add scene');
      }
      
      if (project) {
        setProject({
          ...project,
          scenes: [...(project.scenes || []), result.data.scene]
        });
      }
      
      return result.data.scene;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mcpService, project]);

  const generateSceneAssets = useCallback(async (projectId: string, sceneId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Generate image prompt
      await mcpService.callTool('generate_image_prompt', { projectId, sceneId });
      
      // Generate scene image
      await mcpService.callTool('generate_scene_image', { projectId, sceneId });
      
      // Generate scene script
      await mcpService.callTool('generate_scene_script', { projectId, sceneId });
      
      // Generate scene video
      await mcpService.callTool('generate_scene_video', { projectId, sceneId });
      
      // Refresh project data
      await getProject(projectId);
    } catch (err) {
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
    createProject,
    getProject,
    updateProject,
    addScene,
    generateSceneAssets,
    compileVideo
  };
}