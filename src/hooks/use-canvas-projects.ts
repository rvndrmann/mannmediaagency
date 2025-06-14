
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
    updateScene,
    deleteScene: deleteSceneFromCanvas,
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
        final_video_url: p.final_video_url || null,
        full_script: p.full_script || '',
        main_product_image_url: p.main_product_image_url || null,
        project_assets: p.project_assets || [],
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

  // Mock projects for development/testing purposes
  const getMockProjects = (): CanvasProject[] => {
    return [
      {
        id: "mock-1",
        title: "Sample Project 1",
        description: "This is a sample project for testing",
        final_video_url: null,
        full_script: "This is a sample script for Project 1",
        main_product_image_url: null,
        project_assets: [],
        user_id: "mock-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cover_image_url: "",
        scenes: [],
        // Compatibility aliases
        userId: "mock-user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fullScript: "This is a sample script for Project 1"
      },
      {
        id: "mock-2",
        title: "Sample Project 2",
        description: "Another sample project for testing",
        final_video_url: null,
        full_script: "This is a sample script for Project 2",
        main_product_image_url: null,
        project_assets: [],
        user_id: "mock-user",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        cover_image_url: "",
        scenes: [],
        // Compatibility aliases
        userId: "mock-user",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        fullScript: "This is a sample script for Project 2"
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
  const updateProject = useCallback(async (id: string, data: Partial<CanvasProject>): Promise<any> => {
    try {
      // Prepare the update data for the database (handle potential snake_case)
      const dbData: any = { ...data };
      if (data.main_product_image_url !== undefined) {
        dbData.main_product_image_url = data.main_product_image_url;
      }
      // Add other potential mappings if needed

      const { data: updatedProject, error } = await supabase
        .from('canvas_projects')
        .update(dbData) // Use dbData
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // --- BEGIN AUTO-POPULATE SCENES ---
      let sceneUpdatePromise = Promise.resolve(); // Initialize with a resolved promise
      const newMainImageUrl = data.main_product_image_url;
      if (newMainImageUrl !== undefined) {
        console.log(`[useCanvasProjects] Main image updated for project ${id} to ${newMainImageUrl}. Auto-populating scenes...`);
        // Assign the async operation to the promise variable
        sceneUpdatePromise = (async () => {
          try {
            console.log(`[useCanvasProjects] Attempting to update canvas_scenes for project_id ${id}...`);
            const { data: sceneUpdateData, error: sceneUpdateError } = await supabase
              .from('canvas_scenes')
              .update({ product_image_url: newMainImageUrl })
              .eq('project_id', id)
              .select('id');

            if (sceneUpdateError) {
              console.error(`[useCanvasProjects] Error auto-populating scene images for project ${id}:`, sceneUpdateError);
              toast.error(`Failed to update scene images: ${sceneUpdateError.message}`);
            } else {
              console.log(`[useCanvasProjects] Successfully updated product_image_url for ${sceneUpdateData?.length || 0} scenes in project ${id}.`);
            }
          } catch (sceneUpdateErr) {
             console.error(`[useCanvasProjects] Exception during scene auto-population for project ${id}:`, sceneUpdateErr);
             toast.error("An exception occurred while updating scene images.");
          }
        })(); // Immediately invoke the async IIFE
      }
      // --- END AUTO-POPULATE SCENES ---

      // Update local projects list state immediately (UI might show stale scenes briefly)
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, ...data };
        }
        return p;
      }));

      // Wait for the scene update to complete *before* refreshing the useCanvas state
      await sceneUpdatePromise;

      // Update the project state within the useCanvas hook if this is the currently selected project
      if (projectId === id && fetchProject) {
         console.log(`[useCanvasProjects] Scene update awaited. Fetching project ${id} to refresh useCanvas state...`);
         await fetchProject(); // Await the fetch as well
         console.log(`[useCanvasProjects] fetchProject completed for ${id}.`);
      }


      return updatedProject;
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Failed to update project");
      throw err;
    }
  }, [projectId, fetchProject]); // Added projectId and fetchProject dependencies

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
    isLoading, // Alias for ProjectSelector
    error,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene: deleteSceneFromCanvas, // Return the renamed function as deleteScene
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  };
}
