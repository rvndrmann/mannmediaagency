
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';
import { CanvasService } from '@/services/canvas/CanvasService';
import { normalizeProject, normalizeScene } from '@/utils/canvas-data-utils';

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  // Removed separate scenes state - will derive from project.scenes
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
// Derive scenes from project state
const scenes = project?.scenes || [];

// Initialize canvas service
const canvasService = CanvasService.getInstance();
  // Removed duplicate canvasService declaration

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
      
      // REMOVED logic that automatically selected the first scene
      
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project data");
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId, canvasService]); // REMOVED selectedSceneId dependency

  // Update selected scene when scenes or selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = project?.scenes?.find(s => s.id === selectedSceneId) || null; // Find in project.scenes
      setSelectedScene(scene);
    } else {
      setSelectedScene(null);
    }
  }, [project?.scenes, selectedSceneId]); // Depend on project.scenes

  // Fetch project and scenes when projectId changes
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Create a new project
  const createProject = useCallback(async (title: string, description?: string): Promise<string> => {
    try {
      // Use canvasService to create a project in the database
      const newProject = await canvasService.createProject(title, description || "");
      
      if (newProject) {
        // Update local state with the project from the database
        setProject(newProject);
        toast.success("Project created successfully");
        return newProject.id;
      }
      
      return "";
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
      throw err;
    }
  }, [canvasService]);

  // Add a new scene
  const addScene = useCallback(async (sceneData: Partial<SceneData> = {}): Promise<CanvasScene | null> => {
    if (!project) {
      return null;
    }
    try {
      // Use canvasService to create a scene in the database
      const newScene = await canvasService.createScene(project.id, sceneData);
      
      if (newScene) {
        // Update local state with the scene from the database
        // REMOVED incorrect setScenes call
        toast.success("Scene added successfully");
        // Update the project state to include the new scene
        setProject(prevProject => {
          if (!prevProject) return null;
          const updatedProject = {
            ...prevProject,
            scenes: [...(prevProject.scenes || []), newScene] // Add new scene here
          };
          return updatedProject;
        });
        return newScene; // Return the new scene AFTER updating state
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(`Failed to add scene: ${error.message}`);
      return null;
    }
  }, [project, canvasService]);

  // Delete a scene
  const deleteScene = useCallback(async (sceneId: string): Promise<boolean> => {
    try {
      // Delete the scene from the database
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);
        
      if (error) throw error;
      
      // Update local state
      // Update project state to remove the scene
      setProject(prevProject => {
        if (!prevProject) return null;
        return {
          ...prevProject,
          scenes: (prevProject.scenes || []).filter(s => s.id !== sceneId)
        };
      });
      
      // If the deleted scene was selected, select another one
      // If the deleted scene was selected, select another one based on the updated project state
      if (selectedSceneId === sceneId) {
        const remainingScenes = (project?.scenes || []).filter(s => s.id !== sceneId);
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
  }, [project, selectedSceneId]); // Depend on project state

  // Update a scene
  const updateScene = useCallback(async (
    sceneId: string,
    type: SceneUpdateType,
    value: string
  ): Promise<void> => {
    try {
      // Find the scene in local state
      const scene = project?.scenes?.find(s => s.id === sceneId); // Find in project.scenes
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
      
      // Update the scene in the database
      const success = await canvasService.updateScene(sceneId, updates);
      
      if (!success) {
        throw new Error("Failed to update scene in database");
      }
      
      // Update project state with the updated scene
      setProject(prevProject => {
        if (!prevProject) return null;
        return {
          ...prevProject,
          scenes: (prevProject.scenes || []).map(s =>
            s.id === sceneId ? { ...s, ...updates } : s
          )
        };
      });
      
      // Display success message
      toast.success(`Scene ${type} updated successfully`);
    } catch (err) {
      console.error(`Error updating scene ${type}:`, err);
      toast.error(`Failed to update scene ${type}`);
    }
  }, [project, canvasService]); // Depend on project state

  // Divide a full script into scenes
  const divideScriptToScenes = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update project with full script in the database
      const { error: projectUpdateError } = await supabase
        .from('canvas_projects')
        .update({
          full_script: script,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);
      
      if (projectUpdateError) throw projectUpdateError;
      
      // Update project in local state
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
      
      // Get existing scenes from the database
      const { data: existingScenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_order', { ascending: true });
      
      if (scenesError) throw scenesError;
      
      // Create or update scenes in the database
      const newScenes: CanvasScene[] = [];
      let currentOrder = 1;
      
      for (const sceneText of sceneTexts) {
        const existingScene = existingScenes && existingScenes.length >= currentOrder
          ? existingScenes[currentOrder - 1]
          : null;
        
        if (existingScene) {
          // Update existing scene
          const { error: updateError } = await supabase
            .from('canvas_scenes')
            .update({
              title: `Scene ${currentOrder}`,
              description: sceneText.substring(0, 50) + "...",
              script: sceneText,
              voice_over_text: sceneText,
              scene_order: currentOrder,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingScene.id);
          
          if (updateError) throw updateError;
          
          // Add the updated scene to our local array
          newScenes.push(normalizeScene({
            ...existingScene,
            title: `Scene ${currentOrder}`,
            description: sceneText.substring(0, 50) + "...",
            script: sceneText,
            voice_over_text: sceneText,
            scene_order: currentOrder,
            updated_at: new Date().toISOString()
          }));
        } else {
          // Create a new scene
          const { data: newScene, error: createError } = await supabase
            .from('canvas_scenes')
            .insert({
              project_id: project.id,
              title: `Scene ${currentOrder}`,
              description: sceneText.substring(0, 50) + "...",
              script: sceneText,
              voice_over_text: sceneText,
              scene_order: currentOrder,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) throw createError;
          
          // Add the new scene to our local array
          newScenes.push(normalizeScene(newScene));
        }
        
        currentOrder++;
      }
      
      // If there are excess scenes in the database, delete them
      if (existingScenes && existingScenes.length > sceneTexts.length) {
        for (let i = sceneTexts.length; i < existingScenes.length; i++) {
          await supabase
            .from('canvas_scenes')
            .delete()
            .eq('id', existingScenes[i].id);
        }
      }
      
      // Update scenes in local state
      // Update the main project state with the new scenes array
      setProject(prev => prev ? { ...prev, scenes: newScenes } : null);
      
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
  }, [project]); // Depend only on project state

  // Save full script without dividing
  const saveFullScript = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    
    try {
      // Update the project in the database
      const { error } = await supabase
        .from('canvas_projects')
        .update({
          full_script: script,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Update local state
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
      // Update the project title in the database
      const { error } = await supabase
        .from('canvas_projects')
        .update({
          title: title,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Update local state
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
    scenes: project?.scenes || [], // Return derived scenes
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
