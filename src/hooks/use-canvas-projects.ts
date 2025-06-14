
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
  const canvasHook = useCanvas(projectId);
  const {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    addScene: createScene,
    updateScene,
    deleteScene: deleteSceneFromCanvas,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  } = canvasHook;

  // Create a simple createProject function
  const createProject = useCallback(async (title: string, description: string = '') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from('canvas_projects')
        .insert([{
          title,
          description,
          user_id: userData.user.id,
          project_assets: []
        }])
        .select()
        .single();

      if (error) throw error;

      const newProject: CanvasProject = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        final_video_url: data.final_video_url || null,
        full_script: data.full_script || '',
        main_product_image_url: data.main_product_image_url || null,
        project_assets: data.project_assets || [],
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Compatibility aliases
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        fullScript: data.full_script || ''
      };

      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
      throw err;
    }
  }, []);

  // Fetch all projects for the current user
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error in useCanvasProjects:", sessionError);
      }
      
      let currentUser = sessionData?.session?.user;
      
      if (!currentUser) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error fetching user in useCanvasProjects:", userError);
          setError("Authentication error");
          setProjects([]);
          return;
        }
        
        currentUser = userData?.user;
      }
      
      if (!currentUser) {
        console.warn("No authenticated user found in useCanvasProjects");
        setProjects([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Database error fetching projects:", error);
        throw error;
      }
      
      const normalizedProjects = (data || []).map((p: any): CanvasProject => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        final_video_url: p.final_video_url || null,
        full_script: p.full_script || '',
        main_product_image_url: p.main_product_image_url || null,
        project_assets: Array.isArray(p.project_assets) ? p.project_assets : [],
        user_id: p.user_id || '',
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
        cover_image_url: p.cover_image_url || '',
        scenes: p.scenes || [],
        // Compatibility aliases
        userId: p.user_id || '',
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
        fullScript: p.full_script || ''
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
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== id));
      
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
  const updateProject = useCallback(async (id: string, data: Partial<CanvasProject>): Promise<any> => {
    try {
      const dbData: any = { ...data };
      if (data.main_product_image_url !== undefined) {
        dbData.main_product_image_url = data.main_product_image_url;
      }
      if (data.project_assets) {
        dbData.project_assets = JSON.parse(JSON.stringify(data.project_assets));
      }

      const { data: updatedProject, error } = await supabase
        .from('canvas_projects')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, ...data };
        }
        return p;
      }));

      if (projectId === id && fetchProject) {
         await fetchProject();
      }

      return updatedProject;
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Failed to update project");
      throw err;
    }
  }, [projectId, fetchProject]);

  // Load projects when the component mounts
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Select a project
  const selectProject = useCallback((id: string) => {
    setProjectId(id);
  }, []);

  const deleteScene = useCallback(async (sceneId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) {
        console.error("Error deleting scene:", error);
        toast.error("Failed to delete scene");
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error deleting scene:", err);
      toast.error("Failed to delete scene");
      return false;
    }
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
    isLoading,
    error,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene: deleteSceneFromCanvas,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  };
}
