
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";

interface UseProjectContextOptions {
  initialProjectId?: string;
}

export function useProjectContext(options: UseProjectContextOptions = {}) {
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>(
    "multiagent-active-project", 
    options.initialProjectId || null
  );
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<{id: string, title: string}[]>([]);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const fetchAvailableProjects = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return [];
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('id, title')
        .eq('user_id', userData.user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      setAvailableProjects(data || []);
      setHasLoadedProjects(true);
      return data || [];
    } catch (error) {
      console.error("Error fetching available projects:", error);
      setHasLoadedProjects(true);
      toast.error("Failed to load available projects");
      return [];
    }
  }, []);

  const fetchProjectDetails = useCallback(async (projectId: string, retry = false) => {
    if (!projectId) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        if (projectError.code === 'PGRST116') {
          throw new Error(`Project with ID ${projectId} not found. It may have been deleted.`);
        }
        throw projectError;
      }
      
      if (!projectData) {
        throw new Error(`Project with ID ${projectId} not found.`);
      }
      
      // Fetch scenes for the project
      const { data: scenesData, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select(`
          id, project_id, title, scene_order, script, description, 
          image_prompt, image_url, product_image_url, video_url, 
          voice_over_url, voice_over_text, background_music_url, duration, created_at, updated_at
        `)
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
        
      if (scenesError) throw scenesError;
      
      // Ensure scenesData is an array, even if empty
      const safeScenes = scenesData || [];
      
      // Format project with scenes
      const formattedProject: CanvasProject = {
        id: projectData.id,
        title: projectData.title,
        description: projectData.description || "",
        fullScript: projectData.full_script || "",
        createdAt: projectData.created_at,
        updatedAt: projectData.updated_at,
        userId: projectData.user_id,
        scenes: safeScenes.map(scene => ({
          id: scene.id,
          projectId: scene.project_id,
          title: scene.title || "",
          order: scene.scene_order,
          script: scene.script || "",
          description: scene.description || "", 
          imagePrompt: scene.image_prompt || "",
          imageUrl: scene.image_url || "",
          productImageUrl: scene.product_image_url || "",
          videoUrl: scene.video_url || "",
          voiceOverUrl: scene.voice_over_url || "", 
          backgroundMusicUrl: scene.background_music_url || "", 
          voiceOverText: scene.voice_over_text || "",
          duration: scene.duration || null,
          createdAt: scene.created_at,
          updatedAt: scene.updated_at
        }))
      };
      
      setProjectDetails(formattedProject);
      setLoadAttempts(0);
      return formattedProject;
    } catch (error) {
      console.error("Error fetching project details:", error);
      
      const newAttempts = loadAttempts + 1;
      setLoadAttempts(newAttempts);
      
      if (newAttempts <= 3 && !retry) {
        // Only show one error toast and attempt a retry
        toast.error(error instanceof Error ? error.message : "Failed to load project details");
        
        // Auto-retry once after a short delay
        setTimeout(() => {
          fetchProjectDetails(projectId, true);
        }, 2000);
      } else {
        setError(error instanceof Error ? error.message : "Unknown error fetching project");
        toast.error("Failed to load project details. Please try again later.");
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadAttempts]);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectDetails(activeProjectId);
    } else {
      setProjectDetails(null);
    }
  }, [activeProjectId, fetchProjectDetails]);

  const setActiveProject = useCallback((projectId: string | null) => {
    setActiveProjectId(projectId);
    if (projectId) {
      fetchProjectDetails(projectId);
    } else {
      setProjectDetails(null);
    }
  }, [fetchProjectDetails, setActiveProjectId]);

  const refreshProject = useCallback(() => {
    if (activeProjectId) {
      // Reset attempt counter when manually refreshing
      setLoadAttempts(0);
      return fetchProjectDetails(activeProjectId);
    }
    return null;
  }, [activeProjectId, fetchProjectDetails]);

  return {
    activeProjectId,
    projectDetails,
    isLoading,
    error,
    availableProjects,
    hasLoadedProjects,
    setActiveProject,
    fetchProjectDetails,
    fetchAvailableProjects,
    refreshProject
  };
}
