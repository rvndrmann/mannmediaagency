
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject, CanvasScene, SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';

interface UseCanvasOptions {
  projectId?: string;
}

export const useCanvas = (options: UseCanvasOptions = {}) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedScene = scenes.find(scene => scene.id === selectedSceneId) || null;

  const fetchProject = useCallback(async (projectId: string) => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const mappedProject: CanvasProject = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        userId: data.user_id,
        user_id: data.user_id,
        fullScript: data.full_script || '',
        full_script: data.full_script || '',
        final_video_url: data.final_video_url,
        main_product_image_url: data.main_product_image_url,
        project_assets: [],
        createdAt: data.created_at,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        updated_at: data.updated_at,
        scenes: []
      };

      setProject(mappedProject);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message);
      toast.error('Failed to fetch project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchScenes = useCallback(async (projectId: string) => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });

      if (error) throw error;

      const mappedScenes: CanvasScene[] = data.map(scene => ({
        id: scene.id,
        project_id: scene.project_id,
        projectId: scene.project_id,
        title: scene.title,
        description: scene.description || '',
        script: scene.script || '',
        imagePrompt: scene.image_prompt || '',
        image_prompt: scene.image_prompt || '',
        imageUrl: scene.image_url || '',
        image_url: scene.image_url || '',
        productImageUrl: scene.product_image_url || '',
        product_image_url: scene.product_image_url || '',
        videoUrl: scene.video_url || '',
        video_url: scene.video_url || '',
        voiceOverUrl: scene.voice_over_url || '',
        voice_over_url: scene.voice_over_url || '',
        voiceOverText: scene.voice_over_text || '',
        voice_over_text: scene.voice_over_text || '',
        backgroundMusicUrl: scene.background_music_url || '',
        background_music_url: scene.background_music_url || '',
        sceneImageV1Url: scene.scene_image_v1_url || '',
        scene_image_v1_url: scene.scene_image_v1_url || '',
        sceneImageV2Url: scene.scene_image_v2_url || '',
        scene_image_v2_url: scene.scene_image_v2_url || '',
        sceneOrder: scene.scene_order || 0,
        scene_order: scene.scene_order || 0,
        duration: scene.duration || 0,
        createdAt: scene.created_at,
        created_at: scene.created_at,
        updatedAt: scene.updated_at,
        updated_at: scene.updated_at,
        bria_v2_request_id: scene.bria_v2_request_id || null,
        custom_instruction: scene.custom_instruction || null,
        image_guidance_settings: scene.image_guidance_settings || null,
        // Add compatibility fields for old references
        image: scene.image_url || '',
        video: scene.video_url || '',
        voiceOver: scene.voice_over_url || '',
        backgroundMusic: scene.background_music_url || '',
        productImage: scene.product_image_url || '',
        voiceover_audio_url: null,
        voiceoverAudioUrl: null,
        fal_tts_request_id: null,
        is_template: false,
        template_id: null
      }));

      setScenes(mappedScenes);
    } catch (err: any) {
      console.error('Error fetching scenes:', err);
      toast.error('Failed to fetch scenes');
    }
  }, []);

  const createScene = useCallback(async (projectId: string, sceneData: Partial<CanvasScene>) => {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .insert([{
          project_id: projectId,
          title: sceneData.title || 'New Scene',
          description: sceneData.description || '',
          script: sceneData.script || '',
          image_prompt: sceneData.imagePrompt || '',
          scene_order: sceneData.sceneOrder || 0
        }])
        .select()
        .single();

      if (error) throw error;

      const newScene: CanvasScene = {
        id: data.id,
        project_id: data.project_id,
        projectId: data.project_id,
        title: data.title,
        description: data.description || '',
        script: data.script || '',
        imagePrompt: data.image_prompt || '',
        image_prompt: data.image_prompt || '',
        imageUrl: data.image_url || '',
        image_url: data.image_url || '',
        productImageUrl: data.product_image_url || '',
        product_image_url: data.product_image_url || '',
        videoUrl: data.video_url || '',
        video_url: data.video_url || '',
        voiceOverUrl: data.voice_over_url || '',
        voice_over_url: data.voice_over_url || '',
        voiceOverText: data.voice_over_text || '',
        voice_over_text: data.voice_over_text || '',
        backgroundMusicUrl: data.background_music_url || '',
        background_music_url: data.background_music_url || '',
        sceneImageV1Url: data.scene_image_v1_url || '',
        scene_image_v1_url: data.scene_image_v1_url || '',
        sceneImageV2Url: data.scene_image_v2_url || '',
        scene_image_v2_url: data.scene_image_v2_url || '',
        sceneOrder: data.scene_order || 0,
        scene_order: data.scene_order || 0,
        duration: data.duration || 0,
        createdAt: data.created_at,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        updated_at: data.updated_at,
        bria_v2_request_id: data.bria_v2_request_id || null,
        custom_instruction: data.custom_instruction || null,
        image_guidance_settings: data.image_guidance_settings || null,
        // Add compatibility fields
        image: data.image_url || '',
        video: data.video_url || '',
        voiceOver: data.voice_over_url || '',
        backgroundMusic: data.background_music_url || '',
        productImage: data.product_image_url || '',
        voiceover_audio_url: null,
        voiceoverAudioUrl: null,
        fal_tts_request_id: null,
        is_template: false,
        template_id: null
      };

      setScenes(prev => [...prev, newScene]);
      toast.success('Scene created successfully');
      return newScene;
    } catch (err: any) {
      console.error('Error creating scene:', err);
      toast.error('Failed to create scene');
      throw err;
    }
  }, []);

  const updateScene = useCallback(async (sceneId: string, updateType: SceneUpdateType, value: string) => {
    try {
      const updateMap: Record<SceneUpdateType, string> = {
        'script': 'script',
        'imagePrompt': 'image_prompt',
        'description': 'description',
        'image': 'image_url',
        'productImage': 'product_image_url',
        'video': 'video_url',
        'voiceOver': 'voice_over_url',
        'backgroundMusic': 'background_music_url',
        'voiceOverText': 'voice_over_text'
      };

      const dbField = updateMap[updateType];
      if (!dbField) {
        throw new Error(`Unknown update type: ${updateType}`);
      }

      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [dbField]: value })
        .eq('id', sceneId);

      if (error) throw error;

      setScenes(prev => prev.map(scene => {
        if (scene.id === sceneId) {
          const updated = { ...scene };
          // Update both camelCase and snake_case versions
          switch (updateType) {
            case 'script':
              updated.script = value;
              break;
            case 'imagePrompt':
              updated.imagePrompt = value;
              updated.image_prompt = value;
              break;
            case 'description':
              updated.description = value;
              break;
            case 'image':
              updated.imageUrl = value;
              updated.image_url = value;
              updated.image = value;
              break;
            case 'productImage':
              updated.productImageUrl = value;
              updated.product_image_url = value;
              updated.productImage = value;
              break;
            case 'video':
              updated.videoUrl = value;
              updated.video_url = value;
              updated.video = value;
              break;
            case 'voiceOver':
              updated.voiceOverUrl = value;
              updated.voice_over_url = value;
              updated.voiceOver = value;
              break;
            case 'backgroundMusic':
              updated.backgroundMusicUrl = value;
              updated.background_music_url = value;
              updated.backgroundMusic = value;
              break;
            case 'voiceOverText':
              updated.voiceOverText = value;
              updated.voice_over_text = value;
              break;
          }
          return updated;
        }
        return scene;
      }));

      toast.success('Scene updated successfully');
    } catch (err: any) {
      console.error('Error updating scene:', err);
      toast.error('Failed to update scene');
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, updates: Partial<CanvasProject>) => {
    try {
      // Convert project assets to JSON string for database storage
      const dbUpdates: any = { ...updates };
      if (updates.project_assets) {
        dbUpdates.project_assets = JSON.stringify(updates.project_assets);
      }

      const { data, error } = await supabase
        .from('canvas_projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      setProject(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Project updated successfully');
    } catch (err: any) {
      console.error('Error updating project:', err);
      toast.error('Failed to update project');
    }
  }, []);

  // Load project and scenes when projectId changes
  useEffect(() => {
    if (options.projectId) {
      fetchProject(options.projectId);
      fetchScenes(options.projectId);
    }
  }, [options.projectId, fetchProject, fetchScenes]);

  return {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    isLoading,
    error,
    fetchProject,
    fetchScenes,
    createScene,
    updateScene,
    updateProject
  };
};
