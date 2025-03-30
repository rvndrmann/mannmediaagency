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
  const [sceneLoading, setSceneLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectAndScenes = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: projectData, error: projectError } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw projectError;
      }

      const { data: scenesData, error: scenesError } = await supabase
        .from("canvas_scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("scene_order", { ascending: true });

      if (scenesError) {
        throw scenesError;
      }

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

  const addScene = async () => {
    if (!project) return;

    try {
      const newSceneId = uuidv4();
      const newSceneOrder = scenes.length + 1;

      const newScene: CanvasScene = {
        id: newSceneId,
        title: `Scene ${newSceneOrder}`,
        script: "",
        imagePrompt: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        productImageUrl: "",
        voiceOverUrl: "",
        backgroundMusicUrl: "",
        voiceOverText: "",
        order: newSceneOrder,
        projectId: project.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: null
      };
      
      setScenes(prev => [...prev, newScene]);
      setSelectedSceneId(newSceneId);
      
      const { error } = await supabase
        .from("canvas_scenes")
        .insert({
          id: newSceneId,
          project_id: project.id,
          title: `Scene ${newSceneOrder}`,
          scene_order: newSceneOrder,
        });

      if (error) {
        setScenes(prev => prev.filter(scene => scene.id !== newSceneId));
        throw error;
      }

      await fetchProjectAndScenes();
      toast.success("New scene added");
    } catch (err: any) {
      console.error("Error adding scene:", err);
      toast.error(err.message || "Failed to add scene");
    }
  };

  const deleteScene = async (sceneId: string) => {
    if (!project) return;

    try {
      const sceneToDelete = scenes.find(s => s.id === sceneId);
      const remainingScenes = scenes.filter(s => s.id !== sceneId);
      
      setScenes(remainingScenes);
      
      if (selectedSceneId === sceneId) {
        const otherScene = remainingScenes[0];
        setSelectedSceneId(otherScene?.id || null);
      }

      const { error } = await supabase
        .from("canvas_scenes")
        .delete()
        .eq("id", sceneId)
        .eq("project_id", project.id);

      if (error) {
        if (sceneToDelete) {
          setScenes(prev => [...prev, sceneToDelete]);
        }
        throw error;
      }

      toast.success("Scene deleted");
    } catch (err: any) {
      console.error("Error deleting scene:", err);
      toast.error(err.message || "Failed to delete scene");
      await fetchProjectAndScenes();
    }
  };

  const setSceneId = (sceneId: string | null) => {
    if (sceneId !== selectedSceneId) {
      setSceneLoading(true);
      setSelectedSceneId(sceneId);
      setTimeout(() => {
        setSceneLoading(false);
      }, 200);
    }
  };

  const updateScene = async (sceneId: string, type: SceneUpdateType, value: string) => {
    if (!project) return;

    try {
      const updateData: Record<string, any> = {};
      
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

      setProject(prev => prev ? { ...prev, fullScript: script } : null);
      toast.success("Script saved");
    } catch (err: any) {
      console.error("Error saving script:", err);
      toast.error(err.message || "Failed to save script");
    }
  };

  const divideScriptToScenes = async (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => {
    if (!project) return;
    
    try {
      const updatePromises = sceneScripts.map(({ id, content, voiceOverText }) => {
        return supabase
          .from("canvas_scenes")
          .update({
            script: content,
            voice_over_text: voiceOverText || ""
          })
          .eq("id", id)
          .eq("project_id", project.id);
      });
      
      await Promise.all(updatePromises);
      
      await fetchProjectAndScenes();
      
      toast.success("Script divided into scenes successfully");
    } catch (err: any) {
      console.error("Error updating scenes with divided script:", err);
      toast.error(err.message || "Failed to update scenes with divided script");
      throw err;
    }
  };

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
      
      setProject(prev => prev ? { ...prev, title } : null);
      toast.success("Project title updated");
    } catch (err: any) {
      console.error("Error updating project title:", err);
      toast.error(err.message || "Failed to update project title");
    }
  };

  const selectedScene = scenes.find(scene => scene.id === selectedSceneId) || null;

  if (project) {
    project.scenes = scenes;
  }

  return {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId: setSceneId,
    loading,
    sceneLoading,
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
