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
      
      // Check if we have a confirmed auth in localStorage
      const authConfirmed = localStorage.getItem('auth_confirmed') === 'true';
      const userEmail = localStorage.getItem('user_email');
      const authTimestamp = localStorage.getItem('auth_timestamp');
      
      console.log('Canvas projects auth check from localStorage:', {
        authConfirmed,
        userEmail,
        authTimestamp: authTimestamp ? new Date(authTimestamp).toLocaleString() : null
      });
      
      // First try to get session (more reliable than getUser)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error in useCanvasProjects:", sessionError);
        // Continue anyway to try getUser as fallback
      }
      
      let currentUser = sessionData?.session?.user;
      
      // If no session, try getUser as fallback
      if (!currentUser) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        console.log('Canvas projects auth check from getUser:', {
          hasUser: !!userData?.user,
          userError: userError ? userError.message : null
        });
        
        if (userError) {
          console.error("Error fetching user in useCanvasProjects:", userError);
          
          // If we have auth confirmation in localStorage but API calls are failing,
          // continue but with an error message
          if (!authConfirmed) {
            setError("Authentication error");
            setProjects([]);
            return;
          }
          
          // If we have auth confirmation, we'll try to continue with userId from localStorage
          console.warn("Continuing with limited functionality due to auth API errors");
        }
        
        currentUser = userData?.user;
      }
      
      // If we still don't have a user, check if we're in development mode to load sample data
      if (!currentUser) {
        // For development: optionally load mock data if in development
        const isDevMode = process.env.NODE_ENV === 'development';
        
        if (isDevMode && localStorage.getItem('use_mock_data') === 'true') {
          console.log("Loading mock project data for development");
          setProjects(getMockProjects());
          return;
        }
        
        console.warn("No authenticated user found in useCanvasProjects");
        setProjects([]);
        return;
      }
      
      // We have a user, fetch their projects
      console.log("Fetching projects for user:", currentUser.id);
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Database error fetching projects:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} projects for user ${currentUser.id}`);
      
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

  // Mock projects for development/testing purposes
  const getMockProjects = (): CanvasProject[] => {
    return [
      {
        id: "mock-1",
        title: "Sample Project 1",
        description: "This is a sample project for testing",
        userId: "mock-user",
        user_id: "mock-user",
        fullScript: "This is a sample script for Project 1",
        full_script: "This is a sample script for Project 1",
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cover_image_url: "",
        scenes: []
      },
      {
        id: "mock-2",
        title: "Sample Project 2",
        description: "Another sample project for testing",
        userId: "mock-user",
        user_id: "mock-user",
        fullScript: "This is a sample script for Project 2",
        full_script: "This is a sample script for Project 2",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        cover_image_url: "",
        scenes: []
      }
    ];
  };

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
