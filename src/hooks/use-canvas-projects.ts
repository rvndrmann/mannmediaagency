
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { toast } from 'sonner';

export interface UseCanvasProjectsReturn {
  projects: CanvasProject[];
  createProject: (title: string, description?: string) => Promise<CanvasProject>;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  deleteProject: (id: string) => Promise<void>;
  isLoading: boolean;
  
  // Additional properties needed by Canvas.tsx
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<CanvasScene>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
  projectId: string | null;
  fetchProject: (id: string) => Promise<void>;
}

export const useCanvasProjects = (): UseCanvasProjectsReturn => {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedProjects: CanvasProject[] = data.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        userId: item.user_id,
        user_id: item.user_id,
        fullScript: item.full_script || '',
        full_script: item.full_script || '',
        final_video_url: item.final_video_url,
        main_product_image_url: item.main_product_image_url,
        project_assets: Array.isArray(item.project_assets) ? item.project_assets : [],
        createdAt: item.created_at,
        created_at: item.created_at,
        updatedAt: item.updated_at,
        updated_at: item.updated_at,
        scenes: []
      }));

      setProjects(mappedProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (title: string, description = ''): Promise<CanvasProject> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('canvas_projects')
      .insert([{
        title,
        description,
        user_id: user.id,
        full_script: ''
      }])
      .select()
      .single();

    if (error) throw error;

    const newProject: CanvasProject = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      userId: data.user_id,
      user_id: data.user_id,
      fullScript: data.full_script || '',
      full_script: data.full_script || '',
      final_video_url: data.final_video_url,
      main_product_image_url: data.main_product_image_url,
      project_assets: [],
      createdAt: data.created_at,
      created_at: data.created_at,
      updatedAt: data.updated_at,
      updated_at: data.updated_at,
      scenes: []
    };

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<CanvasProject>): Promise<CanvasProject> => {
    const { data, error } = await supabase
      .from('canvas_projects')
      .update({
        title: updates.title,
        description: updates.description,
        full_script: updates.full_script || updates.fullScript
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedProject: CanvasProject = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      userId: data.user_id,
      user_id: data.user_id,
      fullScript: data.full_script || '',
      full_script: data.full_script || '',
      final_video_url: data.final_video_url,
      main_product_image_url: data.main_product_image_url,
      project_assets: [],
      createdAt: data.created_at,
      created_at: data.created_at,
      updatedAt: data.updated_at,
      updated_at: data.updated_at,
      scenes: []
    };

    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    return updatedProject;
  };

  const deleteProject = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('canvas_projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const fetchProject = async (id: string): Promise<void> => {
    // Implementation for fetching a single project
    setProjectId(id);
  };

  const createScene = async (projectId: string, data: any): Promise<CanvasScene> => {
    // Implementation for creating a scene
    throw new Error('Not implemented');
  };

  const updateScene = async (sceneId: string, type: string, value: string): Promise<void> => {
    // Implementation for updating a scene
    throw new Error('Not implemented');
  };

  const deleteScene = async (sceneId: string): Promise<void> => {
    // Implementation for deleting a scene
    throw new Error('Not implemented');
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    isLoading,
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createScene,
    updateScene,
    deleteScene,
    loading: isLoading,
    projectId,
    fetchProject
  };
};
