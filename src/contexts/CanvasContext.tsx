
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CanvasProject, CanvasScene, SceneUpdateType } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface CanvasContextType {
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  loading: boolean;
  sceneLoading: boolean;
  error: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createProject: (title: string, description?: string) => Promise<string>;
  addScene: () => Promise<string | null>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  updateProjectTitle: (title: string) => Promise<void>;
  fetchProjectAndScenes: () => Promise<void>;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children, projectId }: { children: ReactNode; projectId?: string }) {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const getSelectedScene = useCallback(() => {
    return scenes.find(scene => scene.id === selectedSceneId) || null;
  }, [scenes, selectedSceneId]);

  const fetchProjectAndScenes = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setScenes([]);
      setSelectedSceneId(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error("Authentication error: Please log in again");
      }
      
      if (!authData.user) {
        throw new Error("You must be logged in to access projects");
      }
      
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) {
        throw projectError;
      }
      
      if (!projectData) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Verify project ownership
      if (projectData.user_id !== authData.user.id) {
        throw new Error("You don't have permission to access this project");
      }

      // Fetch scenes for the project
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

      const transformedScenes: CanvasScene[] = (scenesData || []).map(scene => ({
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
      toast.error(err.message || "Failed to load project");
      
      // Reset state on error
      setProject(null);
      setScenes([]);
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

      // Create first scene
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

      return data.id;
    } catch (err: any) {
      console.error("Error creating project:", err);
      throw new Error(err.message || "Failed to create project");
    }
  };

  const addScene = async (): Promise<string | null> => {
    if (!project) return null;

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

      toast.success("New scene added");
      return newSceneId;
    } catch (err: any) {
      console.error("Error adding scene:", err);
      toast.error(err.message || "Failed to add scene");
      return null;
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
      // Create a batch of updates
      const updates = sceneScripts.map(({ id, content, voiceOverText }) => ({
        id,
        script: content,
        voice_over_text: voiceOverText || '',
        project_id: project.id
      }));

      // Execute all updates in a transaction
      const { error } = await supabase.rpc('update_scenes_batch', { 
        updates_json: JSON.stringify(updates) 
      });
      
      if (error) throw error;

      // Update local state
      const updatedScenes = scenes.map(scene => {
        const update = sceneScripts.find(s => s.id === scene.id);
        if (update) {
          return {
            ...scene,
            script: update.content,
            voiceOverText: update.voiceOverText || scene.voiceOverText
          };
        }
        return scene;
      });
      
      setScenes(updatedScenes);
      toast.success("Scenes updated from script");
    } catch (err: any) {
      console.error("Error dividing script to scenes:", err);
      toast.error(err.message || "Failed to divide script to scenes");
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

  return (
    <CanvasContext.Provider value={{
      project,
      scenes,
      selectedScene: getSelectedScene(),
      selectedSceneId,
      loading,
      sceneLoading,
      error,
      setSelectedSceneId,
      createProject,
      addScene,
      deleteScene,
      updateScene,
      divideScriptToScenes,
      saveFullScript,
      updateProjectTitle,
      fetchProjectAndScenes
    }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
