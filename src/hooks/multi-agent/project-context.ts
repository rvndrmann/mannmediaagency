
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";

interface UseProjectContextOptions {
  initialProjectId?: string;
}

// Define the type for the cached project data
interface CachedProject {
  data: CanvasProject;
  timestamp: number;
}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

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
  
  // Use local storage to cache project data
  const [localProjectCache, setLocalProjectCache] = useLocalStorage<Record<string, CachedProject>>(
    "multiagent-project-cache",
    {}
  );

  // Clear expired cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const updatedCache: Record<string, CachedProject> = {};
    let hasChanges = false;
    
    Object.entries(localProjectCache).forEach(([key, value]) => {
      if (now - value.timestamp < CACHE_EXPIRATION) {
        updatedCache[key] = value;
      } else {
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setLocalProjectCache(updatedCache);
    }
  }, [localProjectCache, setLocalProjectCache]);

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
      return [];
    }
  }, []);

  const fetchProjectDetails = useCallback(async (projectId: string) => {
    if (!projectId) return null;
    
    try {
      // First check if we have a valid cache entry
      const cachedProject = localProjectCache[projectId];
      const now = Date.now();
      
      if (cachedProject && now - cachedProject.timestamp < CACHE_EXPIRATION) {
        console.log(`Using cached project data for ${projectId}`);
        setProjectDetails(cachedProject.data);
        return cachedProject.data;
      }
      
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
      
      // Update the cache with the new data
      const newCache = {
        ...localProjectCache,
        [projectId]: {
          data: formattedProject,
          timestamp: now
        }
      };
      setLocalProjectCache(newCache);
      
      setProjectDetails(formattedProject);
      return formattedProject;
    } catch (error) {
      console.error("Error fetching project details:", error);
      setError(error instanceof Error ? error.message : "Unknown error fetching project");
      // Show a toast message for better user feedback
      toast.error(error instanceof Error ? error.message : "Failed to load project details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [localProjectCache, setLocalProjectCache]);

  useEffect(() => {
    // Clean up expired cache entries on mount and when cache changes
    cleanupCache();
  }, [cleanupCache]);

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
    refreshProject: () => activeProjectId ? fetchProjectDetails(activeProjectId) : null
  };
}
