
import { supabase } from "@/integrations/supabase/client";
import { MCPService } from "@/services/mcp/MCPService";
import { CanvasProject, CanvasScene, SceneData } from "@/types/canvas";

export class CanvasService {
  // Static instance for singleton pattern
  private static instance: CanvasService;
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }

  /**
   * Get all canvas projects for the current user
   */
  public async getProjects(): Promise<CanvasProject[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform database data to match our CanvasProject type
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        userId: item.user_id,
        fullScript: item.full_script || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        scenes: []
      }));
    } catch (error) {
      console.error("Error fetching canvas projects:", error);
      return [];
    }
  }

  /**
   * Get a specific project by ID
   */
  public async getProject(projectId: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Transform database data to match our CanvasProject type
      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        userId: data.user_id,
        fullScript: data.full_script || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        scenes: []
      };
    } catch (error) {
      console.error(`Error fetching canvas project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get scenes for a project
   */
  public async getScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (error) throw error;
      
      // Transform database data to match our CanvasScene type
      return (data || []).map(item => ({
        id: item.id,
        projectId: item.project_id,
        title: item.title || '',
        script: item.script || '',
        description: item.description || '',
        imagePrompt: item.image_prompt || '',
        imageUrl: item.image_url || '',
        videoUrl: item.video_url || '',
        sceneOrder: item.scene_order || 0,
        productImageUrl: item.product_image_url || '',
        voiceOverText: item.voice_over_text || '',
        voiceOverUrl: item.voice_over_url || '',
        backgroundMusicUrl: item.background_music_url || '',
        duration: item.duration || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error(`Error fetching scenes for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Create a new scene
   */
  public async createScene(projectId: string, sceneData: Partial<SceneData> = {}): Promise<CanvasScene | null> {
    try {
      // Get the current highest sequence number for the project
      const { data: scenes, error: sceneError } = await supabase
        .from('canvas_scenes')
        .select('scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: false })
        .limit(1);
      
      if (sceneError) throw sceneError;
      
      // Set the sequence to be one higher than the current highest
      const sceneOrder = scenes && scenes.length > 0 ? (scenes[0].scene_order || 0) + 1 : 0;
      
      // Create the new scene
      const { data, error } = await supabase
        .from('canvas_scenes')
        .insert([{ 
          project_id: projectId,
          scene_order: sceneOrder,
          title: sceneData.title || `Scene ${sceneOrder + 1}`,
          script: sceneData.script || '',
          description: sceneData.description || '',
          image_prompt: sceneData.imagePrompt || ''
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Transform database response to match our CanvasScene type
      return {
        id: data.id,
        projectId: data.project_id,
        title: data.title || '',
        script: data.script || '',
        description: data.description || '',
        imagePrompt: data.image_prompt || '',
        imageUrl: data.image_url || '',
        videoUrl: data.video_url || '',
        sceneOrder: data.scene_order || 0,
        productImageUrl: data.product_image_url || '',
        voiceOverText: data.voice_over_text || '',
        voiceOverUrl: data.voice_over_url || '',
        backgroundMusicUrl: data.background_music_url || '',
        duration: data.duration || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error creating scene for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Update a scene
   */
  public async updateScene(sceneId: string, updates: Partial<CanvasScene>): Promise<boolean> {
    try {
      const dbUpdates: Record<string, any> = {};
      
      if (updates.script !== undefined) dbUpdates.script = updates.script;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.imagePrompt !== undefined) dbUpdates.image_prompt = updates.imagePrompt;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.voiceOverText !== undefined) dbUpdates.voice_over_text = updates.voiceOverText;
      if (updates.voiceOverUrl !== undefined) dbUpdates.voice_over_url = updates.voiceOverUrl;
      if (updates.backgroundMusicUrl !== undefined) dbUpdates.background_music_url = updates.backgroundMusicUrl;
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(dbUpdates)
        .eq('id', sceneId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error updating scene ${sceneId}:`, error);
      return false;
    }
  }

  /**
   * Update scene description
   */
  public async updateSceneDescription(sceneId: string, useMcp = true): Promise<boolean> {
    try {
      // For now, just a simple update with placeholder data
      return await this.updateScene(sceneId, {
        description: "Generated scene description " + new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error generating description for scene ${sceneId}:`, error);
      return false;
    }
  }

  /**
   * Update image prompt
   */
  public async updateImagePrompt(sceneId: string, useMcp = true): Promise<boolean> {
    try {
      // For now, just a simple update with placeholder data
      return await this.updateScene(sceneId, {
        imagePrompt: "Generated image prompt " + new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error generating image prompt for scene ${sceneId}:`, error);
      return false;
    }
  }

  /**
   * Generate image for a scene
   */
  public async generateImage(params: { sceneId: string, prompt?: string, version?: string }, useMcp = true): Promise<boolean> {
    try {
      // For now, just a simple update with placeholder data
      return await this.updateScene(params.sceneId, {
        imageUrl: `https://placehold.co/600x400?text=Generated+Image+${Date.now()}`
      });
    } catch (error) {
      console.error(`Error generating image for scene ${params.sceneId}:`, error);
      return false;
    }
  }

  /**
   * Generate video for a scene
   */
  public async generateVideo(params: { sceneId: string, aspectRatio?: string }, useMcp = true): Promise<boolean> {
    try {
      // For now, just a simple update with placeholder data
      return await this.updateScene(params.sceneId, {
        videoUrl: `https://placehold.co/600x400?text=Generated+Video+${Date.now()}`
      });
    } catch (error) {
      console.error(`Error generating video for scene ${params.sceneId}:`, error);
      return false;
    }
  }
}
