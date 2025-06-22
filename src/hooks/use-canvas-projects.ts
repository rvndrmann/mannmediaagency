
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, ProjectAsset } from "@/types/canvas";
import { toast } from "sonner";

export const useCanvasProjects = () => {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (title: string, description?: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('canvas_projects')
        .insert({
          title,
          description,
          user_id: user.id,
          full_script: '',
          project_assets: JSON.stringify([])
        })
        .select()
        .single();

      if (error) throw error;

      const newProject: CanvasProject = {
        id: data.id,
        title: data.title,
        description: data.description,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        full_script: data.full_script || '',
        final_video_url: data.final_video_url,
        main_product_image_url: data.main_product_image_url,
        project_assets: []
      };

      setProjects(prev => [newProject, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  };

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const transformedProjects: CanvasProject[] = (data || []).map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        user_id: project.user_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        full_script: project.full_script || '',
        final_video_url: project.final_video_url,
        main_product_image_url: project.main_product_image_url,
        project_assets: Array.isArray(project.project_assets) 
          ? (project.project_assets as unknown as ProjectAsset[])
          : []
      }));

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<CanvasProject>) => {
    try {
      // Convert project_assets to JSON if it exists
      const updateData = { ...updates };
      if (updateData.project_assets) {
        updateData.project_assets = JSON.stringify(updateData.project_assets) as any;
      }

      const { error } = await supabase
        .from('canvas_projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      ));

      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      throw error;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setScenes([]);
      }

      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      throw error;
    }
  };

  const fetchScenes = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });

      if (error) throw error;

      const transformedScenes: CanvasScene[] = (data || []).map(scene => ({
        id: scene.id,
        title: scene.title || '',
        script: scene.script || '',
        image_prompt: scene.image_prompt || '',
        description: scene.description || '',
        image_url: scene.image_url || '',
        video_url: scene.video_url || '',
        product_image_url: scene.product_image_url || '',
        voice_over_url: scene.voice_over_url || '',
        background_music_url: scene.background_music_url || '',
        voice_over_text: scene.voice_over_text || '',
        scene_order: scene.scene_order,
        project_id: scene.project_id,
        created_at: scene.created_at,
        updated_at: scene.updated_at,
        duration: scene.duration,
        bria_v2_request_id: scene.bria_v2_request_id,
        custom_instruction: scene.custom_instruction,
        fal_tts_request_id: scene.fal_tts_request_id,
        is_template: scene.is_template,
        template_id: scene.template_id
      }));

      setScenes(transformedScenes);
    } catch (error) {
      console.error('Error fetching scenes:', error);
      setError('Failed to load scenes');
    }
  };

  const selectProject = (project: CanvasProject) => {
    setSelectedProject(project);
    fetchScenes(project.id);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    selectedProject,
    scenes,
    isLoading,
    error,
    createProject,
    fetchProjects,
    updateProject,
    deleteProject,
    selectProject,
    fetchScenes
  };
};
