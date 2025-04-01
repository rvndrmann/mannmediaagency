
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneData } from '@/types/canvas';
import { toast } from 'sonner';
import { CanvasService } from '@/services/canvas/CanvasService';

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas service
  const canvasService = CanvasService.getInstance();

  // Fetch project and scenes
  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get project data
      const projectData = await canvasService.getProject(projectId);
      
      if (!projectData) {
        setError("Project not found");
        return;
      }
      
      // Ensure user_id compatibility
      const project = {
        id: projectData.id,
        title: projectData.title,
        description: projectData.description || "",
        userId: projectData.userId || projectData.user_id,
        user_id: projectData.user_id || projectData.userId,
        fullScript: projectData.fullScript || projectData.full_script || "",
        createdAt: projectData.createdAt || projectData.created_at,
        updatedAt: projectData.updatedAt || projectData.updated_at,
        scenes: []
      };
      
      setProject(project);
      
      // Get scenes
      const scenesData = await canvasService.getScenes(projectId);
      setScenes(scenesData);
      
      // Set selected scene if any
      if (scenesData.length > 0 && !selectedSceneId) {
        setSelectedSceneId(scenesData[0].id);
      }
      
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project data");
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId, canvasService, selectedSceneId]);

  // Update selected scene when scenes or selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId) || null;
      setSelectedScene(scene);
    } else {
      setSelectedScene(null);
    }
  }, [scenes, selectedSceneId]);

  // Fetch project and scenes when projectId changes
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Create a new project
  const createProject = useCallback(async (title: string, description?: string): Promise<string> => {
    try {
      const newProject = await canvasService.createProject(title, description || "");
      
      if (!newProject) {
        throw new Error("Failed to create project");
      }
      
      return newProject.id;
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
      throw err;
    }
  }, [canvasService]);

  // Add a new scene
  const addScene = useCallback(async (sceneData: Partial<SceneData> = {}): Promise<CanvasScene | null> => {
    if (!project) return null;
    
    try {
      const newScene = await canvasService.createScene(project.id, sceneData);
      
      if (newScene) {
        setScenes(prev => [...prev, newScene]);
        return newScene;
      }
      
      return null;
    } catch (err) {
      console.error("Error adding scene:", err);
      toast.error("Failed to add scene");
      return null;
    }
  }, [project, canvasService]);

  // Delete a scene
  const deleteScene = useCallback(async (sceneId: string): Promise<boolean> => {
    try {
      // Delete the scene
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);
      
      if (error) throw error;
      
      // Update local state
      setScenes(prev => prev.filter(s => s.id !== sceneId));
      
      // If the deleted scene was selected, select another one
      if (selectedSceneId === sceneId) {
        const remainingScenes = scenes.filter(s => s.id !== sceneId);
        if (remainingScenes.length > 0) {
          setSelectedSceneId(remainingScenes[0].id);
        } else {
          setSelectedSceneId(null);
        }
      }
      
      return true;
    } catch (err) {
      console.error("Error deleting scene:", err);
      toast.error("Failed to delete scene");
      return false;
    }
  }, [scenes, selectedSceneId]);

  // Update a scene
  const updateScene = useCallback(async (
    sceneId: string, 
    type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'voiceOverText', 
    value: string
  ): Promise<void> => {
    try {
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) return;
      
      const updates: Partial<CanvasScene> = {};
      
      switch (type) {
        case 'script':
          updates.script = value;
          break;
        case 'imagePrompt':
          updates.imagePrompt = value;
          break;
        case 'description':
          updates.description = value;
          break;
        case 'image':
          updates.imageUrl = value;
          break;
        case 'productImage':
          updates.productImageUrl = value;
          break;
        case 'video':
          updates.videoUrl = value;
          break;
        case 'voiceOver':
          updates.voiceOverUrl = value;
          break;
        case 'voiceOverText':
          updates.voiceOverText = value;
          break;
        case 'backgroundMusic':
          updates.backgroundMusicUrl = value;
          break;
      }
      
      // Update the scene in the database
      const success = await canvasService.updateScene(sceneId, updates);
      
      if (!success) {
        throw new Error(`Failed to update scene ${type}`);
      }
      
      // Update local state
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return { ...s, ...updates };
        }
        return s;
      }));
    } catch (err) {
      console.error(`Error updating scene ${type}:`, err);
      toast.error(`Failed to update scene ${type}`);
    }
  }, [scenes, canvasService]);

  // Divide a full script into scenes
  const divideScriptToScenes = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update project with full script
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: script })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Update project state
      setProject(prev => {
        if (!prev) return null;
        return { ...prev, fullScript: script };
      });
      
      // Call the function to divide the script
      const { data, error: fnError } = await supabase.functions.invoke('canvas-divide-script', {
        body: { projectId: project.id, script }
      });
      
      if (fnError) throw fnError;
      
      // Refresh scenes
      const scenesData = await canvasService.getScenes(project.id);
      setScenes(scenesData);
      
      return true;
    } catch (err) {
      console.error("Error dividing script:", err);
      toast.error("Failed to divide script into scenes");
      return false;
    }
  }, [project, canvasService]);

  // Save full script without dividing
  const saveFullScript = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update project with full script
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: script })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Update project state
      setProject(prev => {
        if (!prev) return null;
        return { ...prev, fullScript: script };
      });
      
      return true;
    } catch (err) {
      console.error("Error saving full script:", err);
      toast.error("Failed to save full script");
      return false;
    }
  }, [project]);

  // Update project title
  const updateProjectTitle = useCallback(async (title: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update project title
      const { error } = await supabase
        .from('canvas_projects')
        .update({ title })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Update project state
      setProject(prev => {
        if (!prev) return null;
        return { ...prev, title };
      });
      
      return true;
    } catch (err) {
      console.error("Error updating project title:", err);
      toast.error("Failed to update project title");
      return false;
    }
  }, [project]);

  return {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading,
    error,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProject
  };
};
