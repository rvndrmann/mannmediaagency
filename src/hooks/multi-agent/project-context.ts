
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CanvasProject } from "@/types/canvas";

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

  const fetchProjectDetails = useCallback(async (projectId: string) => {
    if (!projectId) return null;
    
    try {
      setIsLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Fetch scenes for the project
      const { data: scenesData, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select(`
          id, project_id, title, scene_order, script, description, 
          image_prompt, image_url, product_image_url, video_url, 
          voice_over_url, background_music_url, duration, created_at, updated_at
        `)
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
        
      if (scenesError) throw scenesError;
      
      // Format project with scenes
      const formattedProject: CanvasProject = {
        id: projectData.id,
        title: projectData.title,
        description: projectData.description,
        fullScript: projectData.full_script || "",
        createdAt: projectData.created_at,
        updatedAt: projectData.updated_at,
        userId: projectData.user_id,
        scenes: scenesData.map(scene => ({
          id: scene.id,
          projectId: scene.project_id,
          title: scene.title,
          order: scene.scene_order,
          script: scene.script || "",
          description: scene.description || "", 
          imagePrompt: scene.image_prompt || "",
          imageUrl: scene.image_url || "",
          productImageUrl: scene.product_image_url || "",
          videoUrl: scene.video_url || "",
          voiceOverUrl: scene.voice_over_url || "", 
          backgroundMusicUrl: scene.background_music_url || "", 
          duration: scene.duration,
          createdAt: scene.created_at,
          updatedAt: scene.updated_at
        }))
      };
      
      setProjectDetails(formattedProject);
      return formattedProject;
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch project details when activeProjectId changes
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
    setActiveProject,
    fetchProjectDetails
  };
}
