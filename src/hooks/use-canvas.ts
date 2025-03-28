import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneUpdateType } from "@/types/canvas";
import { toast } from "sonner";

export const useCanvas = (projectId?: string) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('canvas_projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;

        const { data: scenesData, error: scenesError } = await supabase
          .from('canvas_scenes')
          .select(`
            id, project_id, title, scene_order, script, description, 
            image_prompt, image_url, product_image_url, video_url, 
            voice_over_url, background_music_url, duration, created_at, updated_at
          `)
          .eq('project_id', projectId)
          .order('scene_order', { ascending: true });

        if (scenesError) throw scenesError;

        const formattedProject: CanvasProject = {
          id: data.id,
          title: data.title,
          description: data.description,
          fullScript: data.full_script || "",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          userId: data.user_id,
          scenes: scenesData.map(scene => ({
            id: scene.id,
            projectId: scene.project_id,
            title: scene.title,
            order: scene.scene_order,
            script: scene.script,
            description: scene.description || "", 
            imagePrompt: scene.image_prompt,
            imageUrl: scene.image_url,
            productImageUrl: scene.product_image_url || "",
            videoUrl: scene.video_url,
            voiceOverUrl: scene.voice_over_url || "", 
            backgroundMusicUrl: scene.background_music_url || "", 
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
        setError("Failed to load project");
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const createProject = async (title: string, description?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a project");
        return null;
      }
      
      const newProjectId = uuidv4();
      
      const { error } = await supabase.from('canvas_projects').insert({
        id: newProjectId,
        title,
        description,
        user_id: user.id,
        full_script: ""
      });

      if (error) throw error;
      
      const sceneId = uuidv4();
      const { error: sceneError } = await supabase.from('canvas_scenes').insert({
        id: sceneId,
        project_id: newProjectId,
        title: 'Scene 1',
        scene_order: 0
      });

      if (sceneError) throw sceneError;

      return newProjectId;
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project");
      toast.error("Failed to create project");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addScene = async () => {
    if (!project) return;
    
    try {
      setError(null);
      const newSceneOrder = project.scenes.length;
      const sceneId = uuidv4();
      
      const { error } = await supabase.from('canvas_scenes').insert({
        id: sceneId,
        project_id: project.id,
        title: `Scene ${newSceneOrder + 1}`,
        scene_order: newSceneOrder
      });

      if (error) throw error;
      
      const newScene: CanvasScene = {
        id: sceneId,
        projectId: project.id,
        title: `Scene ${newSceneOrder + 1}`,
        order: newSceneOrder,
        script: "",
        description: "",
        imagePrompt: "",
        imageUrl: "",
        videoUrl: "",
        productImageUrl: "",
        voiceOverUrl: "",
        backgroundMusicUrl: "",
        duration: null,
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
      setError("Failed to add scene");
      toast.error("Failed to add scene");
      return undefined;
    }
  };

  const deleteScene = async (sceneId: string) => {
    if (!project) return;
    
    try {
      setError(null);
      if (project.scenes.length <= 1) {
        toast.error("Cannot delete the only scene");
        return;
      }
      
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;
      
      setProject(prev => {
        if (!prev) return null;
        
        const remainingScenes = prev.scenes.filter(scene => scene.id !== sceneId);
        
        const reorderedScenes = remainingScenes.map((scene, index) => ({
          ...scene,
          order: index
        }));
        
        return {
          ...prev,
          scenes: reorderedScenes
        };
      });
      
      if (selectedSceneId === sceneId) {
        const remainingScenes = project.scenes.filter(scene => scene.id !== sceneId);
        if (remainingScenes.length > 0) {
          setSelectedSceneId(remainingScenes[0].id);
        } else {
          setSelectedSceneId(null);
        }
      }
      
      const { data: remainingScenes } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_order', { ascending: true });
      
      if (remainingScenes && remainingScenes.length > 0) {
        for (let i = 0; i < remainingScenes.length; i++) {
          await supabase
            .from('canvas_scenes')
            .update({ scene_order: i })
            .eq('id', remainingScenes[i].id);
        }
      }
    } catch (error) {
      console.error("Error deleting scene:", error);
      setError("Failed to delete scene");
      toast.error("Failed to delete scene");
    }
  };

  const updateScene = async (sceneId: string, type: SceneUpdateType, value: string) => {
    if (!project) return;
    
    try {
      setError(null);
      const fieldMap: Record<SceneUpdateType, string> = {
        script: 'script',
        description: 'description',
        imagePrompt: 'image_prompt',
        image: 'image_url',
        productImage: 'product_image_url',
        video: 'video_url',
        voiceOver: 'voice_over_url',
        backgroundMusic: 'background_music_url'
      };
      
      const field = fieldMap[type];
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [field]: value })
        .eq('id', sceneId);

      if (error) throw error;
      
      setProject(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          scenes: prev.scenes.map(scene => {
            if (scene.id === sceneId) {
              const updatedScene = { ...scene, updatedAt: new Date().toISOString() };
              
              if (type === 'script') updatedScene.script = value;
              else if (type === 'description') updatedScene.description = value;
              else if (type === 'imagePrompt') updatedScene.imagePrompt = value;
              else if (type === 'image') updatedScene.imageUrl = value;
              else if (type === 'productImage') updatedScene.productImageUrl = value;
              else if (type === 'video') updatedScene.videoUrl = value;
              else if (type === 'voiceOver') updatedScene.voiceOverUrl = value;
              else if (type === 'backgroundMusic') updatedScene.backgroundMusicUrl = value;
              
              return updatedScene;
            }
            return scene;
          })
        };
      });
      
      toast.success(`Scene ${type} updated`);
    } catch (error) {
      console.error("Error updating scene:", error);
      setError("Failed to update scene");
      toast.error("Failed to update scene");
    }
  };

  const saveFullScript = async (script: string) => {
    if (!project) return;
    
    try {
      setError(null);
      
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: script })
        .eq('id', project.id);
        
      if (error) throw error;
      
      setProject(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          fullScript: script,
          updatedAt: new Date().toISOString()
        };
      });
      
    } catch (error) {
      console.error("Error saving full script:", error);
      setError("Failed to save full script");
      toast.error("Failed to save full script");
      throw error;
    }
  };

  const divideScriptToScenes = async (sceneScripts: Array<{ id: string; content: string }>) => {
    if (!project) return;
    
    try {
      setError(null);
      
      for (const sceneScript of sceneScripts) {
        const { error } = await supabase
          .from('canvas_scenes')
          .update({ script: sceneScript.content })
          .eq('id', sceneScript.id);
          
        if (error) throw error;
      }
      
      setProject(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          scenes: prev.scenes.map(scene => {
            const updatedScript = sceneScripts.find(s => s.id === scene.id);
            if (updatedScript) {
              return {
                ...scene,
                script: updatedScript.content,
                updatedAt: new Date().toISOString()
              };
            }
            return scene;
          })
        };
      });
      
    } catch (error) {
      console.error("Error updating scene scripts:", error);
      setError("Failed to divide script");
      toast.error("Failed to divide script");
      throw error;
    }
  };

  const selectedScene = selectedSceneId && project
    ? project.scenes.find(scene => scene.id === selectedSceneId) || null
    : null;

  return {
    project,
    loading,
    error,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript
  };
};
