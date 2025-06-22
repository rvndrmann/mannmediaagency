
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, ProjectAsset } from "@/types/canvas";

export const useCanvas = () => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const createProject = async (title: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('canvas_projects')
        .insert([{ user_id: user.id, title, description }])
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error: any) {
      console.error("Error creating project:", error);
      throw error;
    }
  };

  const updateProjectTitle = async (title: string) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ title })
        .eq('id', project.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, title } : null);
    } catch (error) {
      console.error('Error updating project title:', error);
      throw error;
    }
  };

  const updateMainImageUrl = async (imageUrl: string) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ main_product_image_url: imageUrl })
        .eq('id', project.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, main_product_image_url: imageUrl } : null);
    } catch (error) {
      console.error('Error updating main image URL:', error);
      throw error;
    }
  };

  const createScene = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: sceneData, error } = await supabase
        .from('canvas_scenes')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return sceneData;
    } catch (error: any) {
      console.error("Error creating scene:", error);
      throw error;
    }
  };

  const updateScene = async (sceneId: string, type: string, value: string) => {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [type]: value })
        .eq('id', sceneId);

      if (error) throw error;

      setScenes(prev =>
        prev.map(scene =>
          scene.id === sceneId ? { ...scene, [type]: value } : scene
        )
      );
    } catch (error) {
      console.error(`Error updating scene ${type}:`, error);
      throw error;
    }
  };

  const deleteScene = async (sceneId: string) => {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;

      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    } catch (error) {
      console.error("Error deleting scene:", error);
      throw error;
    }
  };

  const divideScriptToScenes = async (script: string) => {
    try {
      // Call supabase function to divide script
      const { data, error } = await supabase.functions.invoke('divide-script', {
        body: {
          script,
          projectId: project?.id
        }
      });

      if (error) throw error;

      // Update scenes state with the new scenes from function
      setScenes(data);
    } catch (error) {
      console.error("Error dividing script to scenes:", error);
      throw error;
    }
  };

  const saveFullScript = async (script: string) => {
     if (!project) return;

    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: script })
        .eq('id', project.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, full_script: script } : null);
    } catch (error) {
      console.error('Error saving full script:', error);
      throw error;
    }
  };

  const updateProjectAssets = async (assets: ProjectAsset[]) => {
    if (!project) return;
    
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ 
          project_assets: JSON.stringify(assets)
        })
        .eq('id', project.id);

      if (error) throw error;
      
      setProject(prev => prev ? { ...prev, project_assets: assets } : null);
    } catch (error) {
      console.error('Error updating project assets:', error);
      throw error;
    }
  };

  return {
    project,
    scenes,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    createScene,
    updateScene,
    deleteScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    updateMainImageUrl,
    updateProjectAssets
  };
};
