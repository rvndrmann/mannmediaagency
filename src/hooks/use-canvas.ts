
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';
import { CanvasService } from '@/services/canvas/CanvasService';
import { normalizeProject, normalizeScene } from '@/utils/canvas-data-utils';
// OpenAI import and client initialization removed

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
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
  }, [project, selectedSceneId]); // Depend on the whole project object and selectedSceneId

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
      const error = err instanceof Error ? err : new Error(String(err));
      // Log the specific Supabase error if available
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
          updates.backgroundMusicUrl = value;
          updates.background_music_url = value;
          break;
        case 'sceneImageV1':
          updates.sceneImageV1Url = value;
          updates.scene_image_v1_url = value;
          break;
        case 'sceneImageV2':
          updates.sceneImageV2Url = value;
          updates.scene_image_v2_url = value;
          break;
      }
      
      // Update the timestamp
      updates.updatedAt = new Date().toISOString();
      updates.updated_at = new Date().toISOString();
      
      // Update the scene in the database
      const success = await canvasService.updateScene(sceneId, updates, type, value); // Pass type and value
      
      if (!success) {
        throw new Error("Failed to update scene in database");
      }
      
      // Update project state and capture the newly updated scene object
      let newlyUpdatedScene: CanvasScene | null = null;
      setProject(prevProject => {
        if (!prevProject) return null;
        const newScenes = (prevProject.scenes || []).map(s => {
          if (s.id === sceneId) {
            // Create the fully updated scene object here
            newlyUpdatedScene = { ...s, ...updates };
            return newlyUpdatedScene;
          }
          return s;
        });
        return {
          ...prevProject,
          scenes: newScenes
        };
      });

      // Explicitly update selectedScene state if the updated scene is the selected one
      if (newlyUpdatedScene && selectedSceneId === sceneId) {
        setSelectedScene(newlyUpdatedScene);
         console.log("Explicitly updated selectedScene state for ID:", sceneId);
      }

      // Display success message
      toast.success(`Scene ${type} updated successfully`);
    } catch (err) {
      console.error(`Error updating scene ${type}:`, err);
      toast.error(`Failed to update scene ${type}`);
    }
  }, [project, canvasService]); // Depend on project state

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

  // Divide a full script into scenes using AI via Edge Function
  const divideScriptToScenes = useCallback(async (script: string): Promise<boolean> => {
    if (!project) {
      toast.error("No project selected.");
      return false;
    }
    // No OpenAI client check needed here

    setLoading(true); // Indicate processing start
    toast.info("AI is dividing the script into scenes via Edge Function...");

    try {
      // 1. Save the full script first (optional, but good practice)
      await saveFullScript(script);

      // 2. Call the Supabase Edge Function
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        'divide-script', // Name of the Edge Function
        {
          body: { script }, // Pass the script in the body
        }
      );

      if (functionError) {
        console.error("Edge function 'divide-script' invocation error:", functionError);
        // Attempt to parse Supabase function error details if available
        let detailMessage = functionError.message;
        try {
            const context = JSON.parse(functionError.context || '{}');
            if (context.error) detailMessage = context.error;
        } catch(e) { /* Ignore parsing error */ }
        throw new Error(`Failed to call AI service: ${detailMessage}`);
      }

      // The Edge Function returns the parsed JSON directly
      const aiScenes = functionResponse?.scenes; // Access the 'scenes' array

      // Validate the structure received from the Edge Function
      if (!aiScenes || !Array.isArray(aiScenes)) {
         console.error("Invalid response structure from 'divide-script' Edge function:", functionResponse);
         throw new Error("Invalid response format received from AI service.");
      }
      // Ensure expected fields exist (runtime check)
      if (aiScenes.length > 0 && (typeof aiScenes[0].scene_script === 'undefined' || typeof aiScenes[0].image_prompt === 'undefined')) {
          console.error("Missing expected fields in scene data from Edge function:", aiScenes[0]);
          throw new Error("AI service response missing required scene data fields.");
      }


      // 3. Get existing scenes from the database (Keep this part)
      const { data: existingDbScenesData, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_order', { ascending: true });

      if (scenesError) throw scenesError;
      const existingDbScenes = (existingDbScenesData || []).map(normalizeScene);

      // 6. Create/Update/Delete scenes in the database

      // Define a type for the data needed to create a new scene
      type NewSceneData = {
        projectId: string;
        title: string;
        script: string;
        voiceOverText: string;
        imagePrompt: string;
        description: string;
        sceneOrder: number;
        createdAt: string;
        // Add other non-DB generated fields required by CanvasScene, initialized
        imageUrl?: string;
        videoUrl?: string;
        productImageUrl?: string;
        voiceOverUrl?: string;
        backgroundMusicUrl?: string;
        duration?: number;
        userId?: string; // Assuming userId comes from project
      };

      const scenesToCreate: NewSceneData[] = []; // Use the simpler type
      const scenesToUpdate: { id: string; updates: Partial<CanvasScene> }[] = [];
      const sceneIdsToDelete: string[] = existingDbScenes.map(s => s.id); // Assume all existing are deleted initially

      for (let i = 0; i < aiScenes.length; i++) {
        const aiSceneData = aiScenes[i];
        const sceneOrder = i + 1;
        const sceneTitle = `Scene ${sceneOrder}`; // Simple title based on order

        const existingScene = existingDbScenes[i];

        // Use snake_case for DB interaction, camelCase for local state/types if needed later
        const sceneDbPayload = {
          project_id: project.id,
          title: sceneTitle,
          script: aiSceneData.scene_script,
          voice_over_text: aiSceneData.scene_script, // Use script as voice-over for now
          image_prompt: aiSceneData.image_prompt,
          description: aiSceneData.scene_script.substring(0, 100) + (aiSceneData.scene_script.length > 100 ? "..." : ""), // Basic description
          scene_order: sceneOrder,
          updated_at: new Date().toISOString(),
        };

        if (existingScene) {
          // Prepare update
          scenesToUpdate.push({
            id: existingScene.id,
            updates: sceneDbPayload, // Use DB payload for update
          });
          // Mark this ID as not to be deleted
          const indexToDelete = sceneIdsToDelete.indexOf(existingScene.id);
          if (indexToDelete > -1) {
            sceneIdsToDelete.splice(indexToDelete, 1);
          }
        } else {
          // Prepare create using the NewSceneData type
          scenesToCreate.push({
            projectId: project.id,
            title: sceneTitle,
            script: aiSceneData.scene_script,
            voiceOverText: aiSceneData.scene_script, // Defaulting voiceOverText to script
            imagePrompt: aiSceneData.image_prompt,
            description: sceneDbPayload.description, // Use already calculated description
            sceneOrder: sceneOrder,
            createdAt: new Date().toISOString(),
            userId: project.userId, // Get userId from project
            // Initialize other optional fields as needed
            imageUrl: '',
            videoUrl: '',
            productImageUrl: '',
            voiceOverUrl: '',
            backgroundMusicUrl: '',
            duration: 0,
          });
        }
      }

      // Perform database operations
      const updatePromises = scenesToUpdate.map(item =>
        supabase.from('canvas_scenes').update(item.updates).eq('id', item.id).select().single()
      );

      // Prepare data for insertion using snake_case matching DB columns
      const scenesToInsertDb = scenesToCreate.map(sceneData => ({
          project_id: sceneData.projectId,
          title: sceneData.title,
          script: sceneData.script,
          voice_over_text: sceneData.voiceOverText,
          image_prompt: sceneData.imagePrompt,
          description: sceneData.description,
          scene_order: sceneData.sceneOrder,
          created_at: sceneData.createdAt,
          updated_at: sceneData.createdAt, // Set updated_at same as created_at for new records
          // Map other fields from NewSceneData to snake_case if they exist in the DB table
          image_url: sceneData.imageUrl || null,
          video_url: sceneData.videoUrl || null,
          product_image_url: sceneData.productImageUrl || null,
          voice_over_url: sceneData.voiceOverUrl || null,
          background_music_url: sceneData.backgroundMusicUrl || null,
          duration: sceneData.duration || 0,
          // user_id: sceneData.userId // Map userId if your DB table has it
      }));

      const createPromise = scenesToInsertDb.length > 0
        ? supabase.from('canvas_scenes').insert(scenesToInsertDb).select()
        : Promise.resolve({ data: [], error: null });

      const deletePromise = sceneIdsToDelete.length > 0
        ? supabase.from('canvas_scenes').delete().in('id', sceneIdsToDelete)
        : Promise.resolve({ error: null });

      const [updateResults, createResult, deleteResult] = await Promise.all([
        Promise.all(updatePromises),
        createPromise,
        deletePromise,
      ]);

      // Check for errors in DB operations
      const updateErrors = updateResults.map(r => r.error).filter(Boolean);
      if (updateErrors.length > 0 || createResult.error || deleteResult.error) {
        console.error("DB Errors:", { updateErrors, createError: createResult.error, deleteError: deleteResult.error });
        throw new Error("Failed to update scenes in database.");
      }

      // Combine results for local state update
      const finalScenes = [
        ...updateResults.map(r => normalizeScene(r.data)), // Normalize updated scenes
        ...(createResult.data || []).map(normalizeScene) // Normalize newly created scenes
      ].sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));


      // 7. Update local state
      setProject(prev => prev ? { ...prev, scenes: finalScenes } : null);

      // 8. Select first scene if available
      if (finalScenes.length > 0) {
        setSelectedSceneId(finalScenes[0].id);
      } else {
        setSelectedSceneId(null);
      }

      toast.success(`AI successfully divided script into ${finalScenes.length} scenes.`);
      return true;

    } catch (err) {
      console.error("Error dividing script with AI:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error(`Failed to divide script: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false); // Indicate processing end
    }
  }, [project, saveFullScript]); // Remove openaiClient dependency

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

  // Function to update main project image URL and scenes, plus local state
  const updateMainImageUrl = useCallback(async (imageUrl: string): Promise<boolean> => {
    if (!project?.id) {
      toast.error("Project not found");
      return false;
    }
    const projectId = project.id;
    console.log(`[useCanvas] Updating main image for project ${projectId} to ${imageUrl}`);

    try {
      // 1. Update canvas_projects table
      const { error: projectUpdateError } = await supabase
        .from('canvas_projects')
        .update({ main_product_image_url: imageUrl })
        .eq('id', projectId);

      if (projectUpdateError) {
        console.error(`[useCanvas] Error updating project main image:`, projectUpdateError);
        throw projectUpdateError;
      }
      console.log(`[useCanvas] Successfully updated project main image in DB.`);

      // 2. Update canvas_scenes table
      const { data: sceneUpdateData, error: sceneUpdateError } = await supabase
        .from('canvas_scenes')
        .update({ product_image_url: imageUrl }) // Update scene product image URL
        .eq('project_id', projectId)
        .select('id'); // Select IDs to see how many rows were affected

      if (sceneUpdateError) {
        console.error(`[useCanvas] Error auto-populating scene images:`, sceneUpdateError);
        // Don't throw, but maybe show a warning toast
        toast.warning("Main image updated, but failed to update scene images.");
      } else {
        console.log(`[useCanvas] Successfully updated product_image_url for ${sceneUpdateData?.length || 0} scenes.`);
      }

      // 3. Update local state directly for immediate UI feedback
      setProject(prevProject => {
        if (!prevProject) return null;
        // Update scenes locally as well
        const updatedScenes = (prevProject.scenes || []).map(scene => ({
          ...scene,
          productImageUrl: imageUrl, // Update camelCase version for UI
          product_image_url: imageUrl // Update snake_case version for consistency
        }));
        return {
          ...prevProject,
          main_product_image_url: imageUrl,
          scenes: updatedScenes
        };
      });
      console.log(`[useCanvas] Local project state updated with new main image URL.`);
      return true;

    } catch (error) {
      console.error(`[useCanvas] Failed to update main image URL:`, error);
      toast.error(`Failed to update main image: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [project?.id]); // Depend only on project.id

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
    fetchProject,
    updateMainImageUrl // Ensure this is exported
  };
};
