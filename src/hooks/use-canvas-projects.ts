import { useCallback, useEffect, useState } from 'react';
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCanvas } from '@/hooks/use-canvas';

export function useCanvasProjects() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alias loading as isLoading for compatibility with ProjectSelector
  const isLoading = loading;

  // Use the canvas hook for the selected project
  const {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene: createScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  } = useCanvas(projectId);

  // Fetch all projects for the current user
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        console.warn("No authenticated user found");
        setProjects([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Properly normalize the data from snake_case to camelCase
      const normalizedProjects = (data || []).map((p: any): CanvasProject => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        userId: p.user_id || p.userId || '',
        user_id: p.user_id || p.userId || '',
        fullScript: p.full_script || p.fullScript || '',
        full_script: p.full_script || p.fullScript || '',
        createdAt: p.created_at || p.createdAt || new Date().toISOString(),
        created_at: p.created_at || p.createdAt || new Date().toISOString(),
        updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
        updated_at: p.updated_at || p.updatedAt || new Date().toISOString(),
        cover_image_url: p.cover_image_url || '',
        scenes: p.scenes || []
      }));
      
      setProjects(normalizedProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a project
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Delete the project
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // If this was the current project, clear it
      if (projectId === id) {
        setProjectId(null);
      }
      
      return true;
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Failed to delete project");
      return false;
    }
  }, [projectId]);

  // Update a project
  const updateProject = useCallback(async (id: string, data: any): Promise<any> => {
    try {
      const { data: updatedProject, error } = await supabase
        .from('canvas_projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, ...data };
        }
        return p;
      }));
      
      return updatedProject;
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Failed to update project");
      throw err;
    }
  }, []);

  // Load projects when the component mounts
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Select a project
  const selectProject = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  return {
    projectId,
    project,
    projects,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading,
    isLoading, // Alias for ProjectSelector
    error,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  };
}
