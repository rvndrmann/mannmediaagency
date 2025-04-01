
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUser } from './use-user';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export interface UseCanvasProjectsReturn {
  projects: CanvasProject[];
  createProject: (title: string, description?: string) => Promise<CanvasProject>;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  deleteProject: (id: string) => Promise<void>;
  isLoading: boolean;
  
  // Additional properties needed by Canvas.tsx
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<CanvasScene>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
  projectId: string | null;
  fetchProject: (id: string) => Promise<void>;
}

export function useCanvasProjects() {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { user } = useUser();

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching canvas projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [user, fetchProjects]);

  const createProject = async (title: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to create a project');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .insert({
          title,
          description: description || '',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProjects(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<CanvasProject>) => {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProjects(prev =>
        prev.map(project => (project.id === id ? data : project))
      );
      
      if (project && project.id === id) {
        setProject({ ...project, ...updates });
      }
      
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setProjects(prev => prev.filter(project => project.id !== id));
      
      if (project && project.id === id) {
        setProject(null);
        setScenes([]);
        setSelectedScene(null);
        setSelectedSceneId(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };
  
  const fetchProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      setProject(data);
      setProjectId(id);
      
      // Fetch scenes for this project
      const { data: scenesData, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', id)
        .order('scene_order', { ascending: true });
        
      if (scenesError) throw scenesError;
      
      setScenes(scenesData || []);
      
      if (scenesData && scenesData.length > 0 && !selectedSceneId) {
        setSelectedSceneId(scenesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [selectedSceneId]);
  
  const createScene = async (projectId: string, data: any) => {
    try {
      const { data: newScene, error } = await supabase
        .from('canvas_scenes')
        .insert([{
          project_id: projectId,
          ...data
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setScenes(prev => [...prev, newScene]);
      return newScene;
    } catch (error) {
      console.error('Error creating scene:', error);
      toast.error('Failed to create scene');
      return null;
    }
  };
  
  const updateScene = async (sceneId: string, type: string, value: string) => {
    try {
      const fieldMap: Record<string, string> = {
        script: 'script',
        imagePrompt: 'image_prompt',
        description: 'description',
        image: 'image_url',
        productImage: 'product_image_url',
        video: 'video_url',
        voiceOver: 'voice_over_url',
        voiceOverText: 'voice_over_text',
        backgroundMusic: 'background_music_url',
        imageUrl: 'image_url',
        videoUrl: 'video_url'
      };
      
      const dbField = fieldMap[type] || type;
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [dbField]: value })
        .eq('id', sceneId);
        
      if (error) throw error;
      
      // Update local state
      setScenes(prev => prev.map(scene => {
        if (scene.id === sceneId) {
          // Update both the camelCase and snake_case versions of the field
          return { 
            ...scene, 
            [type]: value,
            [dbField]: value 
          };
        }
        return scene;
      }));
      
      // Update selected scene if it's the one being modified
      if (selectedScene && selectedScene.id === sceneId) {
        setSelectedScene(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [type]: value,
            [dbField]: value
          };
        });
      }
    } catch (error) {
      console.error(`Error updating scene ${type}:`, error);
      toast.error(`Failed to update scene ${type}`);
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
      
      if (selectedSceneId === sceneId) {
        const remainingScenes = scenes.filter(s => s.id !== sceneId);
        if (remainingScenes.length > 0) {
          setSelectedSceneId(remainingScenes[0].id);
        } else {
          setSelectedSceneId(null);
          setSelectedScene(null);
        }
      }
    } catch (error) {
      console.error('Error deleting scene:', error);
      toast.error('Failed to delete scene');
    }
  };
  
  // Update selectedScene when selectedSceneId or scenes change
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId);
      setSelectedScene(scene || null);
    } else {
      setSelectedScene(null);
    }
  }, [selectedSceneId, scenes]);

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: fetchProjects,
    
    // Additional properties for Canvas.tsx
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createScene,
    updateScene,
    deleteScene,
    loading,
    projectId,
    fetchProject
  };
}
