
import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProject = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('canvas_projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;

        const { data: scenesData, error: scenesError } = await supabase
          .from('canvas_scenes')
          .select('*')
          .eq('project_id', projectId)
          .order('order', { ascending: true });

        if (scenesError) throw scenesError;

        const formattedProject: CanvasProject = {
          id: data.id,
          title: data.title,
          description: data.description,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          userId: data.user_id,
          scenes: scenesData.map(scene => ({
            id: scene.id,
            projectId: scene.project_id,
            title: scene.title,
            order: scene.order,
            script: scene.script,
            imagePrompt: scene.image_prompt,
            imageUrl: scene.image_url,
            videoUrl: scene.video_url,
            duration: scene.duration,
            createdAt: scene.created_at,
            updatedAt: scene.updated_at
          }))
        };

        setProject(formattedProject);
        if (formattedProject.scenes.length > 0 && !selectedSceneId) {
          setSelectedSceneId(formattedProject.scenes[0].id);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Create new project
  const createProject = async (title: string, description?: string) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const newProjectId = uuidv4();
      
      const { error } = await supabase.from('canvas_projects').insert({
        id: newProjectId,
        title,
        description,
        user_id: user.id
      });

      if (error) throw error;
      
      // Create initial scene
      const sceneId = uuidv4();
      const { error: sceneError } = await supabase.from('canvas_scenes').insert({
        id: sceneId,
        project_id: newProjectId,
        title: 'Scene 1',
        order: 0
      });

      if (sceneError) throw sceneError;

      // Return the new project ID so we can navigate to it
      return newProjectId;
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a new scene
  const addScene = async () => {
    if (!project) return;
    
    try {
      const newSceneOrder = project.scenes.length;
      const sceneId = uuidv4();
      
      const { error } = await supabase.from('canvas_scenes').insert({
        id: sceneId,
        project_id: project.id,
        title: `Scene ${newSceneOrder + 1}`,
        order: newSceneOrder
      });

      if (error) throw error;
      
      // Update local state
      const newScene: CanvasScene = {
        id: sceneId,
        projectId: project.id,
        title: `Scene ${newSceneOrder + 1}`,
        order: newSceneOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: [...prev.scenes, newScene]
        };
      });
      
      setSelectedSceneId(sceneId);
      
      return sceneId;
    } catch (error) {
      console.error("Error adding scene:", error);
      toast.error("Failed to add scene");
    }
  };

  // Delete a scene
  const deleteScene = async (sceneId: string) => {
    if (!project) return;
    
    try {
      // Don't allow deleting if it's the only scene
      if (project.scenes.length <= 1) {
        toast.error("Cannot delete the only scene");
        return;
      }
      
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;
      
      // Update local state
      setProject(prev => {
        if (!prev) return null;
        
        const remainingScenes = prev.scenes.filter(scene => scene.id !== sceneId);
        
        // Reorder scenes if needed
        const reorderedScenes = remainingScenes.map((scene, index) => ({
          ...scene,
          order: index
        }));
        
        return {
          ...prev,
          scenes: reorderedScenes
        };
      });
      
      // If we deleted the selected scene, select the first available scene
      if (selectedSceneId === sceneId) {
        const remainingScenes = project.scenes.filter(scene => scene.id !== sceneId);
        if (remainingScenes.length > 0) {
          setSelectedSceneId(remainingScenes[0].id);
        } else {
          setSelectedSceneId(null);
        }
      }
    } catch (error) {
      console.error("Error deleting scene:", error);
      toast.error("Failed to delete scene");
    }
  };

  // Update a scene field
  const updateScene = async (sceneId: string, type: SceneUpdateType, value: string) => {
    if (!project) return;
    
    try {
      // Map the type to the database field
      const fieldMap: Record<SceneUpdateType, string> = {
        script: 'script',
        imagePrompt: 'image_prompt',
        image: 'image_url',
        video: 'video_url'
      };
      
      const field = fieldMap[type];
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [field]: value })
        .eq('id', sceneId);

      if (error) throw error;
      
      // Update local state
      setProject(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          scenes: prev.scenes.map(scene => {
            if (scene.id === sceneId) {
              return {
                ...scene,
                [type]: value,
                updatedAt: new Date().toISOString()
              };
            }
            return scene;
          })
        };
      });
      
      toast.success(`Scene ${type} updated`);
    } catch (error) {
      console.error("Error updating scene:", error);
      toast.error("Failed to update scene");
    }
  };

  // Get the currently selected scene
  const selectedScene = selectedSceneId && project
    ? project.scenes.find(scene => scene.id === selectedSceneId) || null
    : null;

  return {
    project,
    loading,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene
  };
};
