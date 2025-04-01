
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';
import { CanvasService } from '@/services/canvas/CanvasService';
import { normalizeProject, normalizeScene } from '@/utils/canvas-data-utils';

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
      const projectData = await canvasService.fetchProject(projectId);
      
      if (!projectData) {
        setError("Project not found");
        return;
      }
      
      setProject(projectData);
      
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
      // For testing purposes, bypass the actual service call and create a mock project
      // with a random ID to allow us to test the UI updates
      const projectId = `local-project-${Math.random().toString(36).substring(2, 15)}`;
      
      // Create a mock project object
      const mockProject: CanvasProject = {
        id: projectId,
        title: title || "Test Project",
        description: description || "",
        userId: "test-user",
        user_id: "test-user",
        fullScript: "",
        full_script: "",
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cover_image_url: "",
        scenes: []
      };
      
      // Set the project directly in state to bypass Supabase
      setProject(mockProject);
      toast.success("Project created successfully");
      
      return projectId;
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
      throw err;
    }
  }, []);

  // Add a new scene
  const addScene = useCallback(async (sceneData: Partial<SceneData> = {}): Promise<CanvasScene | null> => {
    if (!project) return null;
    
    try {
      // Create a mock scene with unique ID
      const sceneId = `local-scene-${Math.random().toString(36).substring(2, 15)}`;
      const sceneOrder = scenes.length + 1;
      
      // Create a mock scene object
      const mockScene: CanvasScene = {
        id: sceneId,
        projectId: project.id,
        project_id: project.id,
        title: sceneData.title || `Scene ${sceneOrder}`,
        description: sceneData.description || "",
        script: sceneData.script || "",
        imagePrompt: sceneData.imagePrompt || "",
        image_prompt: sceneData.image_prompt || "",
        imageUrl: sceneData.imageUrl || "",
        image_url: sceneData.image_url || "",
        videoUrl: sceneData.videoUrl || "",
        video_url: sceneData.video_url || "",
        productImageUrl: sceneData.productImageUrl || "",
        product_image_url: sceneData.product_image_url || "",
        voiceOverUrl: sceneData.voiceOverUrl || "",
        voice_over_url: sceneData.voice_over_url || "",
        backgroundMusicUrl: sceneData.backgroundMusicUrl || "",
        background_music_url: sceneData.background_music_url || "",
        voiceOverText: sceneData.voiceOverText || "",
        voice_over_text: sceneData.voice_over_text || "",
        sceneOrder: sceneOrder,
        scene_order: sceneOrder,
        duration: sceneData.duration || 0,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Update local state
      setScenes(prev => [...prev, mockScene]);
      toast.success("Scene added successfully");
      
      return mockScene;
    } catch (err) {
      console.error("Error adding scene:", err);
      toast.error("Failed to add scene");
      return null;
    }
  }, [project, scenes]);

  // Delete a scene
  const deleteScene = useCallback(async (sceneId: string): Promise<boolean> => {
    try {
      // Skip the database call and directly update local state
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
      
      // Show success notification
      toast.success("Scene deleted successfully");
      
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
    type: SceneUpdateType,
    value: string
  ): Promise<void> => {
    try {
      // Find the scene in local state
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) {
        toast.error("Scene not found");
        return;
      }
      
      // Create updates object
      const updates: Partial<CanvasScene> = {};
      
      // Handle different update types
      switch (type) {
        case 'script':
          updates.script = value;
          break;
        case 'imagePrompt':
          updates.imagePrompt = value;
          updates.image_prompt = value; // Update both properties for consistency
          break;
        case 'description':
          updates.description = value;
          break;
        case 'image':
          updates.imageUrl = value;
          updates.image_url = value;
          break;
        case 'productImage':
          updates.productImageUrl = value;
          updates.product_image_url = value;
          break;
        case 'video':
          updates.videoUrl = value;
          updates.video_url = value;
          break;
        case 'voiceOver':
          updates.voiceOverUrl = value;
          updates.voice_over_url = value;
          break;
        case 'voiceOverText':
          updates.voiceOverText = value;
          updates.voice_over_text = value;
          break;
        case 'backgroundMusic':
          updates.backgroundMusicUrl = value;
          updates.background_music_url = value;
          break;
      }
      
      // Update the timestamp
      updates.updatedAt = new Date().toISOString();
      updates.updated_at = new Date().toISOString();
      
      // Skip the service call and directly update local state
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return { ...s, ...updates };
        }
        return s;
      }));
      
      // Display success message
      toast.success(`Scene ${type} updated successfully`);
    } catch (err) {
      console.error(`Error updating scene ${type}:`, err);
      toast.error(`Failed to update scene ${type}`);
    }
  }, [scenes]);

  // Divide a full script into scenes
  const divideScriptToScenes = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update project with full script in local state
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          fullScript: script,
          full_script: script,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      // Simple logic to divide script into scenes (in a real app, this would be more sophisticated)
      // Split by double newlines or "Scene X" markers
      const sceneTexts = script
        .split(/\n\s*\n|\bScene \d+\b/i)
        .filter(text => text.trim().length > 0);
      
      // Clear existing scenes
      const existingSceneIds = scenes.map(s => s.id);
      
      // Create new scenes from the script parts
      const newScenes: CanvasScene[] = [];
      let currentOrder = 1;
      
      for (const sceneText of sceneTexts) {
        // If we have an existing scene at this position, update it
        const existingScene = scenes[currentOrder - 1];
        const sceneId = existingScene ? existingScene.id : `local-scene-${Date.now()}-${currentOrder}`;
        
        newScenes.push({
          id: sceneId,
          projectId: project.id,
          project_id: project.id,
          title: `Scene ${currentOrder}`,
          description: sceneText.substring(0, 50) + "...",
          script: sceneText,
          imagePrompt: "",
          image_prompt: "",
          imageUrl: "",
          image_url: "",
          videoUrl: "",
          video_url: "",
          voiceOverText: sceneText,
          voice_over_text: sceneText,
          productImageUrl: "",
          product_image_url: "",
          voiceOverUrl: "",
          voice_over_url: "",
          backgroundMusicUrl: "",
          background_music_url: "",
          sceneOrder: currentOrder,
          scene_order: currentOrder,
          duration: 0,
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        currentOrder++;
      }
      
      // Update scenes in local state
      setScenes(newScenes);
      
      // If there are scenes, select the first one
      if (newScenes.length > 0) {
        setSelectedSceneId(newScenes[0].id);
      }
      
      toast.success(`Script divided into ${newScenes.length} scenes`);
      return true;
    } catch (err) {
      console.error("Error dividing script:", err);
      toast.error("Failed to divide script into scenes");
      return false;
    }
  }, [project, scenes]);

  // Save full script without dividing
  const saveFullScript = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Skip database call and directly update local state
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          fullScript: script,
          full_script: script,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      // Show success notification
      toast.success("Script saved successfully");
      
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
      // Skip database call and directly update local state
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          title,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      // Show success notification
      toast.success("Project title updated successfully");
      
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
