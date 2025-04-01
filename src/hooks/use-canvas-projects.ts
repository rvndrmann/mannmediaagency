
import { useState, useEffect, useCallback } from 'react';
import { CanvasProject, CanvasScene, SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';
import axios from 'axios';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.example.com';

// Helper functions to transform data
const mapApiSceneToCanvasScene = (apiScene: any): CanvasScene => {
  return {
    id: apiScene.id,
    projectId: apiScene.project_id,
    title: apiScene.title || '',
    description: apiScene.description || '',
    script: apiScene.script || '',
    imagePrompt: apiScene.image_prompt || '',
    imageUrl: apiScene.image_url || '',
    videoUrl: apiScene.video_url || '',
    sceneOrder: apiScene.scene_order || 0,
    createdAt: apiScene.created_at || '',
    updatedAt: apiScene.updated_at || '',
    voiceOverText: apiScene.voice_over_text || '',
    productImageUrl: apiScene.product_image_url || '',
    voiceOverUrl: apiScene.voice_over_url || '',
    backgroundMusicUrl: apiScene.background_music_url || '',
    duration: apiScene.duration || 5,
    // Add aliases for compatibility
    project_id: apiScene.project_id,
    image_prompt: apiScene.image_prompt,
    image_url: apiScene.image_url,
    video_url: apiScene.video_url,
    scene_order: apiScene.scene_order,
    created_at: apiScene.created_at,
    updated_at: apiScene.updated_at,
    voice_over_text: apiScene.voice_over_text,
    order: apiScene.scene_order || apiScene.order || 0,
  };
};

export const useCanvasProjects = () => {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/canvas/projects`);
      setProjects(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects');
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch project
  const fetchProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/canvas/projects/${id}`);
      setProject(response.data);
      setProjectId(id);
      fetchScenes(id);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to fetch project');
      toast.error('Failed to fetch project');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch scenes
  const fetchScenes = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/canvas/projects/${projectId}/scenes`);
      // Map the API response to our CanvasScene format
      const mappedScenes = response.data.map(mapApiSceneToCanvasScene);
      setScenes(mappedScenes);
      
      // Set selected scene to first scene if no scene is selected
      if (mappedScenes.length > 0 && !selectedSceneId) {
        setSelectedSceneId(mappedScenes[0].id);
      }
    } catch (err) {
      console.error('Error fetching scenes:', err);
      setError('Failed to fetch scenes');
      toast.error('Failed to fetch scenes');
    } finally {
      setLoading(false);
    }
  }, [selectedSceneId]);

  // Create project
  const createProject = useCallback(async (title: string, description?: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/canvas/projects`, {
        title,
        description
      });
      fetchProjects();
      setProject(response.data);
      setProjectId(response.data.id);
      return response.data;
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
      toast.error('Failed to create project');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  // Update project
  const updateProject = useCallback(async (id: string, data: any) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/canvas/projects/${id}`, data);
      
      // Update the project in local state
      setProject(prev => {
        if (prev && prev.id === id) {
          return { ...prev, ...data };
        }
        return prev;
      });
      
      return response.data;
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project');
      toast.error('Failed to update project');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/canvas/projects/${id}`);
      fetchProjects();
      
      // Clear current project if it's the one being deleted
      if (project && project.id === id) {
        setProject(null);
        setProjectId(null);
        setScenes([]);
        setSelectedScene(null);
        setSelectedSceneId(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
      toast.error('Failed to delete project');
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, project]);

  // Create scene
  const createScene = useCallback(async (projectId: string, data: any) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/canvas/projects/${projectId}/scenes`, data);
      // Map the API response to our CanvasScene format
      const newScene = mapApiSceneToCanvasScene(response.data);
      
      // Update scenes list with the new scene
      setScenes(prev => [...prev, newScene]);
      
      return newScene;
    } catch (err) {
      console.error('Error creating scene:', err);
      setError('Failed to create scene');
      toast.error('Failed to create scene');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update scene
  const updateScene = useCallback(async (sceneId: string, type: SceneUpdateType, value: string) => {
    setLoading(true);
    try {
      // Map our type to API field name
      const fieldMap: Record<SceneUpdateType, string> = {
        description: 'description',
        script: 'script',
        imagePrompt: 'image_prompt',
        image: 'image_url',
        video: 'video_url',
        voiceOver: 'voice_over_url',
        voiceOverText: 'voice_over_text', 
        imageUrl: 'image_url',
        videoUrl: 'video_url',
        productImage: 'product_image_url',
        backgroundMusic: 'background_music_url'
      };
      
      const field = fieldMap[type];
      const data = { [field]: value };
      
      const response = await axios.put(`${API_BASE_URL}/api/canvas/scenes/${sceneId}`, data);
      
      // Map the API response to our CanvasScene format
      const updatedScene = mapApiSceneToCanvasScene(response.data);
      
      // Update scenes list with the updated scene
      setScenes(prev => prev.map(scene => 
        scene.id === sceneId ? updatedScene : scene
      ));
      
      // Update selected scene if it's the one being updated
      if (selectedScene && selectedScene.id === sceneId) {
        setSelectedScene(updatedScene);
      }
    } catch (err) {
      console.error(`Error updating scene ${type}:`, err);
      setError(`Failed to update scene ${type}`);
      toast.error(`Failed to update scene ${type}`);
    } finally {
      setLoading(false);
    }
  }, [selectedScene]);

  // Delete scene
  const deleteScene = useCallback(async (sceneId: string) => {
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/canvas/scenes/${sceneId}`);
      
      // Remove scene from scenes list
      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
      
      // Clear selected scene if it's the one being deleted
      if (selectedScene && selectedScene.id === sceneId) {
        setSelectedScene(null);
        setSelectedSceneId(null);
        
        // Set selected scene to first scene in list if there are any left
        setTimeout(() => {
          if (scenes.length > 1) {
            const nextScene = scenes.find(scene => scene.id !== sceneId);
            if (nextScene) {
              setSelectedSceneId(nextScene.id);
            }
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error deleting scene:', err);
      setError('Failed to delete scene');
      toast.error('Failed to delete scene');
    } finally {
      setLoading(false);
    }
  }, [selectedScene, scenes]);

  // Update selected scene when selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId) || null;
      setSelectedScene(scene);
    } else {
      setSelectedScene(null);
    }
  }, [selectedSceneId, scenes]);

  // Load scenes when project changes
  useEffect(() => {
    if (project && project.id) {
      fetchScenes(project.id);
    }
  }, [project, fetchScenes]);

  return {
    projects,
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading,
    error,
    projectId,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene,
    isLoading: loading, // Added for compatibility with ProjectSelector
  };
};
