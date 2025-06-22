
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CanvasScene, CanvasProject } from "@/types/canvas";
import { useSWRConfig } from "swr";

interface PaginatedScenesOptions {
  projectId: string | undefined;
  pageSize?: number;
  initialPage?: number;
}

interface PaginatedScenesResult {
  scenes: CanvasScene[];
  project: CanvasProject | null;
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
  loadNextPage: () => Promise<void>;
  loadPrevPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  refreshData: () => Promise<void>;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
}

export function usePaginatedCanvasData({
  projectId,
  pageSize = 5,
  initialPage = 1
}: PaginatedScenesOptions): PaginatedScenesResult {
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  
  const { mutate } = useSWRConfig();
  
  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  
  // Function to load project data
  const loadProject = useCallback(async () => {
    if (!projectId) return null;
    
    try {
      const { data, error } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .single();
        
      if (error) throw error;
      
      return {
        id: data.id,
        title: data.title,
        userId: data.user_id,
        fullScript: data.full_script || "",
        description: data.description,
        scenes: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as CanvasProject;
    } catch (err: any) {
      console.error("Error loading project:", err);
      setError(err.message || "Failed to load project");
      return null;
    }
  }, [projectId]);
  
  // Function to load paginated scenes
  const loadScenes = useCallback(async (page = 1) => {
    if (!projectId) return [];
    
    try {
      // First get total count for pagination
      const countResponse = await supabase
        .from("canvas_scenes")
        .select("id", { count: "exact" })
        .eq("project_id", projectId);
        
      if (countResponse.error) throw countResponse.error;
      setTotalCount(countResponse.count || 0);
      
      // Then get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await supabase
        .from("canvas_scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("scene_order", { ascending: true })
        .range(from, to);
        
      if (error) throw error;
      
      // Transform data
      return data.map(scene => ({
        id: scene.id,
        title: scene.title,
        script: scene.script || "",
        imagePrompt: scene.image_prompt || "",
        description: scene.description || "",
        imageUrl: scene.image_url || "",
        videoUrl: scene.video_url || "",
        productImageUrl: scene.product_image_url || "",
        voiceOverUrl: scene.voice_over_url || "",
        backgroundMusicUrl: scene.background_music_url || "",
        voiceOverText: scene.voice_over_text || "",
        order: scene.scene_order,
        projectId: scene.project_id,
        createdAt: scene.created_at,
        updatedAt: scene.updated_at,
        duration: scene.duration
      })) as CanvasScene[];
    } catch (err: any) {
      console.error("Error loading scenes:", err);
      setError(err.message || "Failed to load scenes");
      return [];
    }
  }, [projectId, pageSize]);
  
  // Initial data loading
  const loadData = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load project and scenes in parallel
      const [projectData, scenesData] = await Promise.all([
        loadProject(),
        loadScenes(currentPage)
      ]);
      
      setProject(projectData);
      setScenes(scenesData);
      
      // Select first scene if available and none is selected
      if (scenesData.length > 0 && !selectedSceneId) {
        setSelectedSceneId(scenesData[0].id);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentPage, loadProject, loadScenes, selectedSceneId]);
  
  // Load data on initial mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Pagination handlers
  const loadNextPage = async () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const loadPrevPage = async () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const goToPage = async (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Refresh data function
  const refreshData = async () => {
    await loadData();
    // Also invalidate any SWR cache keys related to this project
    if (projectId) {
      mutate(`canvas/project/${projectId}`);
      mutate(`canvas/scenes/${projectId}`);
    }
  };
  
  return {
    scenes,
    project,
    isLoading,
    error,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalPages,
    loadNextPage,
    loadPrevPage,
    goToPage,
    refreshData,
    selectedSceneId,
    setSelectedSceneId
  };
}
