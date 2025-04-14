import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType, ProjectAsset } from '@/types/canvas'; // Import ProjectAsset
import { toast } from 'sonner';
import { CanvasService } from '@/services/canvas/CanvasService';
import { normalizeProject, normalizeScene } from '@/utils/canvas-data-utils';

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]); // State for scenes
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
      setProject(null);
      setScenes([]);
      setSelectedSceneId(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get project data
      const projectData = await canvasService.fetchProject(projectId);
      if (!projectData) {
        setError("Project not found");
        setProject(null);
        setScenes([]);
        setSelectedSceneId(null);
        return;
      }
      setProject(projectData); // Set project state

      // Fetch scenes separately
      const scenesData = await canvasService.getScenes(projectId); // Use getScenes
      setScenes(scenesData || []); // Set scenes state

    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project data");
      toast.error("Failed to load project data");
      setProject(null);
      setScenes([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, canvasService]);

  // Update selected scene when scenes or selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId) || null; // Find in scenes state
      setSelectedScene(scene);
    } else {
      setSelectedScene(null);
    }
  }, [scenes, selectedSceneId]); // Depend on scenes state and selectedSceneId

  // Fetch project and scenes when projectId changes
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Create a new project
  const createProject = useCallback(async (title: string, description?: string): Promise<string> => {
    try {
      const newProject = await canvasService.createProject(title, description || "");
      if (newProject) {
        setProject(newProject);
        setScenes([]); // Reset scenes for new project
        setSelectedSceneId(null);
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
      toast.error("No project selected to add a scene.");
      return null;
    }
    try {
      const newScene = await canvasService.createScene(project.id, sceneData);
      if (newScene) {
        setScenes(prevScenes => [...prevScenes, newScene].sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0))); // Update scenes state and sort
        toast.success("Scene added successfully");
        return newScene;
      }
      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(`Failed to add scene: ${error.message}`);
      return null;
    }
  }, [project, canvasService]);

  // Delete a scene
  const deleteScene = useCallback(async (sceneId: string): Promise<boolean> => {
    const currentScenes = scenes; // Capture current scenes before potential state update
    try {
      // Optimistically update UI
      setScenes(prevScenes => prevScenes.filter(s => s.id !== sceneId));
      if (selectedSceneId === sceneId) {
         const remainingScenes = currentScenes.filter(s => s.id !== sceneId);
         setSelectedSceneId(remainingScenes.length > 0 ? remainingScenes[0].id : null);
      }

      // Delete from DB
      const { error } = await supabase.from('canvas_scenes').delete().eq('id', sceneId);
      if (error) throw error;

      toast.success("Scene deleted successfully");
      return true;
    } catch (err) {
      // Revert UI on error
      setScenes(currentScenes);
      if (selectedSceneId === sceneId) { // Re-select if it was deselected optimistically
          setSelectedSceneId(sceneId);
      }

      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes('constraint')) {
           console.error("Error deleting scene (potential constraint violation):", error);
           toast.error("Failed to delete scene: It might be referenced elsewhere.");
      } else if (error.message.includes('security violation')) {
           console.error("Error deleting scene (RLS violation):", error);
           toast.error("Failed to delete scene: Permission denied.");
      } else {
           console.error("Error deleting scene:", error);
           toast.error(`Failed to delete scene: ${error.message}`);
      }
      return false;
    }
  }, [scenes, selectedSceneId, setSelectedSceneId]); // Depend on scenes state

  // Update a scene
  const updateScene = useCallback(async (
    sceneId: string,
    type: SceneUpdateType,
    value: string | null // Allow null for clearing fields potentially
  ): Promise<void> => {
    const originalScenes = scenes; // Store original state for potential revert
    let newlyUpdatedScene: CanvasScene | null = null;

    try {
      // Optimistic UI Update
      setScenes(prevScenes => {
        return prevScenes.map(s => {
          if (s.id === sceneId) {
            const updates: Partial<CanvasScene> = {};
            // Map type to the correct snake_case property
            switch (type) {
              case 'script': updates.script = value; break;
              case 'imagePrompt': updates.image_prompt = value; break;
              case 'description': updates.description = value; break;
              case 'image': updates.image_url = value; break; // Assuming 'image' updates image_url
              case 'productImage': updates.product_image_url = value; break;
              case 'video': updates.video_url = value; break; // Assuming 'video' updates video_url
              case 'voiceOver': updates.voice_over_url = value; break; // Assuming 'voiceOver' updates voice_over_url
              case 'voiceOverText': updates.voice_over_text = value; break;
              case 'backgroundMusic': updates.background_music_url = value; break;
              case 'sceneImageV1': updates.scene_image_v1_url = value; break;
              case 'sceneImageV2': updates.scene_image_v2_url = value; break;
            }
            updates.updated_at = new Date().toISOString(); // Update timestamp locally too
            newlyUpdatedScene = { ...s, ...updates };
            return newlyUpdatedScene;
          }
          return s;
        });
      });

      // Update selected scene state if it was the one modified
      if (newlyUpdatedScene && selectedSceneId === sceneId) {
        setSelectedScene(newlyUpdatedScene);
      }

      // Prepare DB update object (only snake_case)
      const dbUpdates: { [key: string]: any } = {};
       switch (type) {
         case 'script': dbUpdates.script = value; break;
         case 'imagePrompt': dbUpdates.image_prompt = value; break;
         case 'description': dbUpdates.description = value; break;
         case 'image': dbUpdates.image_url = value; break;
         case 'productImage': dbUpdates.product_image_url = value; break;
         case 'video': dbUpdates.video_url = value; break;
         case 'voiceOver': dbUpdates.voice_over_url = value; break;
         case 'voiceOverText': dbUpdates.voice_over_text = value; break;
         case 'backgroundMusic': dbUpdates.background_music_url = value; break;
         case 'sceneImageV1': dbUpdates.scene_image_v1_url = value; break;
         case 'sceneImageV2': dbUpdates.scene_image_v2_url = value; break;
       }
       dbUpdates.updated_at = new Date().toISOString();


      // Update DB
      const success = await canvasService.updateScene(sceneId, dbUpdates, type, value); // Pass dbUpdates
      if (!success) {
        throw new Error("Failed to update scene in database");
      }

      toast.success(`Scene ${type} updated successfully`);
    } catch (err) {
      // Revert UI on error
      setScenes(originalScenes);
      if (selectedSceneId === sceneId) { // Revert selected scene if needed
         setSelectedScene(originalScenes.find(s => s.id === sceneId) || null);
      }
      console.error(`Error updating scene ${type}:`, err);
      toast.error(`Failed to update scene ${type}`);
    }
  }, [scenes, canvasService, selectedSceneId]); // Depend on scenes state

  // Save full script without dividing
  const saveFullScript = useCallback(async (script: string): Promise<boolean> => {
    if (!project) return false;
    const originalProject = project; // Store original for revert

    try {
      // Optimistic UI update
      setProject(prev => prev ? { ...prev, full_script: script, updated_at: new Date().toISOString() } : null);

      // Update DB
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: script, updated_at: new Date().toISOString() })
        .eq('id', project.id);
      if (error) throw error;

      toast.success("Script saved successfully");
      return true;
    } catch (err) {
      // Revert UI
      setProject(originalProject);
      console.error("Error saving full script:", err);
      toast.error("Failed to save full script");
      return false;
    }
  }, [project]);

  // Divide a full script into scenes using AI via Edge Function
  const divideScriptToScenes = useCallback(async (script: string): Promise<boolean> => {
    if (!project) {
      toast.error("No project selected.");
      return false;
    }

    setLoading(true);
    toast.info("AI is dividing the script into scenes...");
    const originalScenes = scenes; // Store for potential revert

    try {
      await saveFullScript(script); // Save script first

      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        'divide-script', { body: { script } }
      );

      if (functionError) throw new Error(`Edge function error: ${functionError.message}`);

      const aiScenes = functionResponse?.scenes;
      if (!aiScenes || !Array.isArray(aiScenes)) throw new Error("Invalid response format from AI service.");
      if (aiScenes.length > 0 && (typeof aiScenes[0].scene_script === 'undefined' || typeof aiScenes[0].image_prompt === 'undefined')) {
          throw new Error("AI service response missing required scene data fields.");
      }

      // --- Database Sync Logic ---
      const { data: existingDbScenesData, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('id, scene_order') // Select only needed fields
        .eq('project_id', project.id)
        .order('scene_order', { ascending: true });

      if (scenesError) throw scenesError;
      const existingDbScenes = existingDbScenesData || [];

      const scenesToCreate: any[] = [];
      const scenesToUpdate: { id: string; updates: Partial<CanvasScene> }[] = [];
      const sceneIdsToDelete: string[] = existingDbScenes.map(s => s.id);

      for (let i = 0; i < aiScenes.length; i++) {
        const aiSceneData = aiScenes[i];
        const sceneOrder = i + 1;
        const sceneTitle = `Scene ${sceneOrder}`;
        const sceneDbPayload = {
          project_id: project.id,
          title: sceneTitle,
          script: aiSceneData.scene_script,
          voice_over_text: aiSceneData.scene_script,
          image_prompt: aiSceneData.image_prompt,
          description: aiSceneData.scene_script.substring(0, 100) + (aiSceneData.scene_script.length > 100 ? "..." : ""),
          scene_order: sceneOrder,
          updated_at: new Date().toISOString(),
        };

        const existingScene = existingDbScenes[i];
        if (existingScene) {
          scenesToUpdate.push({ id: existingScene.id, updates: sceneDbPayload });
          const indexToDelete = sceneIdsToDelete.indexOf(existingScene.id);
          if (indexToDelete > -1) sceneIdsToDelete.splice(indexToDelete, 1);
        } else {
          scenesToCreate.push({ ...sceneDbPayload, created_at: new Date().toISOString() });
        }
      }

      // Perform DB operations
      const updatePromises = scenesToUpdate.map(item =>
        supabase.from('canvas_scenes').update(item.updates).eq('id', item.id).select().single()
      );
      const createPromise = scenesToCreate.length > 0
        ? supabase.from('canvas_scenes').insert(scenesToCreate).select()
        : Promise.resolve({ data: [], error: null });
      const deletePromise = sceneIdsToDelete.length > 0
        ? supabase.from('canvas_scenes').delete().in('id', sceneIdsToDelete)
        : Promise.resolve({ error: null });

      const [updateResults, createResult, deleteResult] = await Promise.all([
        Promise.all(updatePromises), createPromise, deletePromise
      ]);

      // Check for errors
      const updateErrors = updateResults.map(r => r.error).filter(Boolean);
      if (updateErrors.length > 0 || createResult.error || deleteResult.error) {
        console.error("DB Errors:", { updateErrors, createError: createResult.error, deleteError: deleteResult.error });
        throw new Error("Failed to update scenes in database.");
      }

      // Combine results for local state update
      const finalScenes = [
        ...updateResults.map(r => normalizeScene(r.data)),
        ...(createResult.data || []).map(normalizeScene)
      ].sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));

      // Update local state
      setScenes(finalScenes); // Update scenes state directly

      // Select first scene if available
      setSelectedSceneId(finalScenes.length > 0 ? finalScenes[0].id : null);

      toast.success(`AI successfully divided script into ${finalScenes.length} scenes.`);
      return true;

    } catch (err) {
      // Revert scenes state on error
      setScenes(originalScenes);
      console.error("Error dividing script:", err);
      toast.error(`Failed to divide script: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [project, scenes, saveFullScript]); // Depend on scenes state

  // Update project title
  const updateProjectTitle = useCallback(async (title: string): Promise<boolean> => {
     if (!project) return false;
     const originalProject = project;
     try {
       setProject(prev => prev ? { ...prev, title, updated_at: new Date().toISOString() } : null);
       const { error } = await supabase
         .from('canvas_projects')
         .update({ title, updated_at: new Date().toISOString() })
         .eq('id', project.id);
       if (error) throw error;
       toast.success("Project title updated");
       return true;
     } catch (err) {
       setProject(originalProject);
       console.error("Error updating project title:", err);
       toast.error("Failed to update project title");
       return false;
     }
   }, [project]);

  // Update main project image URL
  const updateMainImageUrl = useCallback(async (imageUrl: string): Promise<boolean> => {
    if (!project) return false;
    const originalProject = project;
    try {
      setProject(prev => prev ? { ...prev, main_product_image_url: imageUrl, updated_at: new Date().toISOString() } : null);
      const { error } = await supabase
        .from('canvas_projects')
        .update({ main_product_image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', project.id);
      if (error) throw error;
      toast.success("Main project image updated successfully");
      return true;
    } catch (err) {
      setProject(originalProject);
      console.error("Error updating main project image:", err);
      toast.error("Failed to update main project image");
      return false;
    }
  }, [project]);

  // Update project assets
  const updateProjectAssets = useCallback(async (assets: ProjectAsset[]): Promise<void> => {
    if (!project) {
      toast.error("No project selected.");
      return;
    }
    const originalProject = project; // Store for revert

    try {
      // Optimistic UI update
      setProject(prev => prev ? { ...prev, project_assets: assets, updated_at: new Date().toISOString() } : null);

      // Update DB
      const { error } = await supabase
        .from('canvas_projects')
        .update({ project_assets: assets, updated_at: new Date().toISOString() })
        .eq('id', project.id);
      if (error) throw error;

      toast.success("Project assets updated successfully");
    } catch (err) {
      // Revert UI
      setProject(originalProject);
      console.error("Error updating project assets:", err);
      console.error("Error updating project assets (detailed):", err);
      toast.error("Failed to update project assets");
    }
  }, [project]);


  return {
    project,
    scenes, // Return scenes state
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading,
    error,
    fetchProject, // Expose fetchProject if needed externally
    addScene,
    updateScene,
    deleteScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    updateProjectAssets, // Return the new function
    updateMainImageUrl
  };
};
