
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";

interface UseProjectContextOptions {
  initialProjectId?: string;
}

interface CachedProject {
  project: CanvasProject;
  timestamp: number;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

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
  const [isOffline, setIsOffline] = useState(false);
  const [localProjectCache, setLocalProjectCache] = useLocalStorage<{[key: string]: CachedProject}>(
    "canvas-project-cache",
    {}
  );
  const [sessionRefreshed, setSessionRefreshed] = useState(false);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("You're back online!");
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You're offline. Some features may be limited.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Preload cached project data immediately if available
  useEffect(() => {
    if (activeProjectId && localProjectCache[activeProjectId]) {
      const cachedData = localProjectCache[activeProjectId];
      const now = Date.now();
      
      // Only use cache if it's not expired
      if (now - cachedData.timestamp < CACHE_DURATION) {
        setProjectDetails(cachedData.project);
      }
    }
  }, [activeProjectId, localProjectCache]);

  const fetchAvailableProjects = useCallback(async () => {
    if (isOffline) {
      // In offline mode, try to show cached projects if available
      const cachedProjects = Object.values(localProjectCache || {}).map(item => ({
        id: item.project.id,
        title: item.project.title
      }));
      
      if (cachedProjects.length > 0) {
        setAvailableProjects(cachedProjects);
        setHasLoadedProjects(true);
        toast.info("Showing cached projects while offline");
        return cachedProjects;
      }
      
      toast.error("You are offline. Please check your internet connection.");
      return [];
    }

    try {
      setIsLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Auth error:", userError);
        
        // Try to refresh the session before giving up
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          toast.error("Authentication error. Please log in again.");
          return [];
        }
        
        // If we successfully refreshed the session, continue with the refreshed user
        userData.user = refreshData.user;
      }
      
      if (!userData?.user) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('id, title')
        .eq('user_id', userData.user.id)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load available projects");
        throw error;
      }
      
      const projects = data || [];
      setAvailableProjects(projects);
      setHasLoadedProjects(true);
      return projects;
    } catch (error) {
      console.error("Error fetching available projects:", error);
      setHasLoadedProjects(true);
      
      // Show different message based on error type
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to load available projects");
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isOffline, localProjectCache]);

  const refreshAuthSession = useCallback(async () => {
    try {
      if (sessionRefreshed) {
        return true; // Don't refresh more than once per component lifecycle
      }
      
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Failed to refresh auth session:", error);
        return false;
      }
      
      setSessionRefreshed(true);
      return !!data.session;
    } catch (error) {
      console.error("Error refreshing auth session:", error);
      return false;
    }
  }, [sessionRefreshed]);

  const fetchProjectDetails = useCallback(async (projectId: string, retry = false) => {
    if (!projectId) return null;
    
    // Return cached project if offline
    if (isOffline) {
      const cachedProject = localProjectCache[projectId];
      if (cachedProject) {
        toast.info("Showing cached project data while offline");
        return cachedProject.project;
      }
      toast.error("You are offline and this project isn't cached. Please reconnect to load it.");
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to refresh auth session on retry attempts
      if (retry && loadAttempts > 1) {
        const refreshed = await refreshAuthSession();
        if (!refreshed) {
          throw new Error("Session expired. Please log in again.");
        }
      }
      
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
      
      // Update local cache with the latest data
      setLocalProjectCache(prev => ({
        ...prev,
        [projectId]: {
          project: formattedProject,
          timestamp: Date.now()
        }
      }));
      
      setProjectDetails(formattedProject);
      setLoadAttempts(0);
      return formattedProject;
    } catch (error) {
      console.error("Error fetching project details:", error);
      
      // Increment load attempts
      const newAttempts = loadAttempts + 1;
      setLoadAttempts(newAttempts);
      
      // Handle network errors differently
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        setError("Network connection issue. Please check your internet connection.");
        
        if (newAttempts <= 3 && !retry) {
          // Only show one error toast and attempt a retry
          toast.error("Network connection issue. Retrying...");
          
          // Auto-retry with exponential backoff
          setTimeout(() => {
            fetchProjectDetails(projectId, true);
          }, Math.min(1000 * Math.pow(2, newAttempts - 1), 8000)); // Max 8 second delay
        } else {
          // Try to use cached data if available
          const cachedProject = localProjectCache[projectId];
          if (cachedProject) {
            toast.info("Using cached project data while experiencing network issues");
            setProjectDetails(cachedProject.project);
            return cachedProject.project;
          }
          
          toast.error("Connection issues persist. Please try again later or check your network.");
        }
        return null;
      }
      
      // Handle other errors
      if (newAttempts <= 3 && !retry) {
        toast.error(error instanceof Error ? error.message : "Failed to load project details");
        
        // Auto-retry once after a short delay
        setTimeout(() => {
          fetchProjectDetails(projectId, true);
        }, 2000);
      } else {
        // Try to use cached data as fallback
        const cachedProject = localProjectCache[projectId];
        if (cachedProject) {
          toast.info("Using cached project data");
          setProjectDetails(cachedProject.project);
          return cachedProject.project;
        }
        
        setError(error instanceof Error ? error.message : "Unknown error fetching project");
        toast.error("Failed to load project details. Please try again later.");
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadAttempts, isOffline, refreshAuthSession, localProjectCache, setLocalProjectCache]);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectDetails(activeProjectId);
    } else {
      setProjectDetails(null);
    }
  }, [activeProjectId, fetchProjectDetails]);

  // Effect to clear error when going online
  useEffect(() => {
    if (!isOffline && error && activeProjectId) {
      // Clear error and retry fetching when going online
      setError(null);
      fetchProjectDetails(activeProjectId);
    }
  }, [isOffline, error, activeProjectId, fetchProjectDetails]);

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
      setError(null);
      return fetchProjectDetails(activeProjectId);
    }
    return null;
  }, [activeProjectId, fetchProjectDetails]);

  // Clear expired cache entries periodically
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      const newCache = { ...localProjectCache };
      let hasChanges = false;
      
      Object.keys(newCache).forEach(key => {
        if (now - newCache[key].timestamp > CACHE_DURATION) {
          delete newCache[key];
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setLocalProjectCache(newCache);
      }
    };
    
    cleanupCache();
    const interval = setInterval(cleanupCache, CACHE_DURATION);
    
    return () => clearInterval(interval);
  }, [localProjectCache, setLocalProjectCache]);

  return {
    activeProjectId,
    projectDetails,
    isLoading,
    error,
    availableProjects,
    hasLoadedProjects,
    isOffline,
    setActiveProject,
    fetchProjectDetails,
    fetchAvailableProjects,
    refreshProject
  };
}
