
import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project and scenes
  const fetchProjectAndScenes = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw projectError;
      }

      // Fetch scenes for this project
      const { data: scenesData, error: scenesError } = await supabase
        .from("canvas_scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("scene_order", { ascending: true });

      if (scenesError) {
        throw scenesError;
      }

      // Transform data to match our interfaces
      const transformedProject: CanvasProject = {
        id: projectData.id,
        title: projectData.title,
        userId: projectData.user_id,
        fullScript: projectData.full_script || "",
        description: projectData.description,
        scenes: [],
        createdAt: projectData.created_at,
        updatedAt: projectData.updated_at
      };

      const transformedScenes: CanvasScene[] = scenesData.map(scene => ({
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
      }));

      setProject(transformedProject);
      setScenes(transformedScenes);
      
      // Select the first scene if there are any and none is currently selected
      if (transformedScenes.length > 0 && !selectedSceneId) {
        setSelectedSceneId(transformedScenes[0].id);
      }
    } catch (err: any) {
      console.error("Error fetching project data:", err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSceneId]);

  useEffect(() => {
    fetchProjectAndScenes();
  }, [fetchProjectAndScenes]);

  // Create a new project
  const createProject = async (title: string, description?: string): Promise<string> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("canvas_projects")
        .insert({
          title,
          description: description || "",
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create an initial scene
      const { error: sceneError } = await supabase
        .from("canvas_scenes")
        .insert({
          project_id: data.id,
          title: "Scene 1",
          scene_order: 1,
        });

      if (sceneError) {
        throw sceneError;
      }

      await fetchProjectAndScenes();
      return data.id;
    } catch (err: any) {
      console.error("Error creating project:", err);
      throw new Error(err.message || "Failed to create project");
    }
  };

  // Add a new scene
  const addScene = async () => {
    if (!project) return;

    try {
      const newSceneId = uuidv4();
      const newSceneOrder = scenes.length + 1;

      const { error } = await supabase
        .from("canvas_scenes")
        .insert({
          id: newSceneId,
          project_id: project.id,
          title: `Scene ${newSceneOrder}`,
          scene_order: newSceneOrder,
        });

      if (error) {
        throw error;
      }

      await fetchProjectAndScenes();
      setSelectedSceneId(newSceneId);
      toast.success("New scene added");
    } catch (err: any) {
      console.error("Error adding scene:", err);
      toast.error(err.message || "Failed to add scene");
    }
  };

  // Delete a scene
  const deleteScene = async (sceneId: string) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from("canvas_scenes")
        .delete()
        .eq("id", sceneId)
        .eq("project_id", project.id);

      if (error) {
        throw error;
      }

      // If the deleted scene was selected, select another scene
      if (selectedSceneId === sceneId) {
        const otherScene = scenes.find(s => s.id !== sceneId);
        setSelectedSceneId(otherScene?.id || null);
      }

      await fetchProjectAndScenes();
      toast.success("Scene deleted");
    } catch (err: any) {
      console.error("Error deleting scene:", err);
      toast.error(err.message || "Failed to delete scene");
    }
  };

  // Update a scene
  const updateScene = async (sceneId: string, type: SceneUpdateType, value: string) => {
    if (!project) return;

    try {
      const updateData: Record<string, any> = {};
      
      // Convert camelCase to snake_case for database fields
      const dbFieldMap: Record<string, string> = {
        script: 'script',
        imagePrompt: 'image_prompt',
        description: 'description',
        image: 'image_url',
        productImage: 'product_image_url',
        video: 'video_url',
        voiceOver: 'voice_over_url',
        voiceOverText: 'voice_over_text',
        backgroundMusic: 'background_music_url',
      };
      
      updateData[dbFieldMap[type]] = value;
      
      const { error } = await supabase
        .from("canvas_scenes")
        .update(updateData)
        .eq("id", sceneId)
        .eq("project_id", project.id);

      if (error) {
        throw error;
      }

      // Update local state to reflect the change
      setScenes(prev => 
        prev.map(scene => 
          scene.id === sceneId 
            ? { ...scene, [type]: value }
            : scene
        )
      );
    } catch (err: any) {
      console.error(`Error updating scene ${type}:`, err);
      toast.error(err.message || `Failed to update scene ${type}`);
      throw err;
    }
  };

  // Save full script
  const saveFullScript = async (script: string) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from("canvas_projects")
        .update({ full_script: script })
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      // Update local state
      setProject(prev => prev ? { ...prev, fullScript: script } : null);
      toast.success("Script saved");
    } catch (err: any) {
      console.error("Error saving script:", err);
      toast.error(err.message || "Failed to save script");
    }
  };

  // Divide script into scenes
  const divideScriptToScenes = async (script: string) => {
    if (!project) return;
    
    try {
      // Get the current scene IDs
      const sceneIds = scenes.map(scene => scene.id);
      
      if (sceneIds.length === 0) {
        throw new Error("No scenes available");
      }

      toast.loading("Processing script...");
      
      // Call the process-script function
      const { data, error } = await supabase.functions.invoke('process-script', {
        body: { 
          script, 
          sceneIds,
          projectId: project.id,
          generateImagePrompts: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Refresh the scenes to show the updated content
      await fetchProjectAndScenes();
      
      toast.dismiss();
      toast.success("Script divided into scenes");
      
      // Show message about image prompts
      if (data.imagePrompts) {
        const { processedScenes, successfulScenes } = data.imagePrompts;
        if (processedScenes > 0) {
          toast.success(`Generated image prompts for ${successfulScenes} out of ${processedScenes} scenes`);
        }
      }
      
    } catch (err: any) {
      console.error("Error dividing script:", err);
      toast.dismiss();
      toast.error(err.message || "Failed to divide script");
    }
  };
  
  // Update project title
  const updateProjectTitle = async (title: string) => {
    if (!project) return;
    
    try {
      const { error } = await supabase
        .from("canvas_projects")
        .update({ title })
        .eq("id", project.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setProject(prev => prev ? { ...prev, title } : null);
      toast.success("Project title updated");
    } catch (err: any) {
      console.error("Error updating project title:", err);
      toast.error(err.message || "Failed to update project title");
    }
  };

  // Find selected scene
  const selectedScene = scenes.find(scene => scene.id === selectedSceneId) || null;

  // Add project to scenes
  if (project) {
    project.scenes = scenes;
  }

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
    updateProjectTitle
  };
};
