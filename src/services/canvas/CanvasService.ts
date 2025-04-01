
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneData } from "@/types/canvas";
import { normalizeProject, normalizeScene } from "@/utils/canvas-data-utils";

/**
 * Service for Canvas projects and scenes
 */
export class CanvasService {
  private static instance: CanvasService;
  
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
   * Fetch a project by ID
   */
  async fetchProject(projectId: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        return normalizeProject(data);
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching project:", error);
      throw error;
    }
  }
  
  /**
   * Get all projects for the current user
   */
  async fetchProjects(): Promise<CanvasProject[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data.map(project => normalizeProject(project));
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }
  }
  
  // Alias for fetchProject for backward compatibility
  async getProject(projectId: string): Promise<CanvasProject | null> {
    return this.fetchProject(projectId);
  }
  
  // Alias for fetchProjects for backward compatibility
  async getProjects(): Promise<CanvasProject[]> {
    return this.fetchProjects();
  }
  
  /**
   * Create a new project
   */
  async createProject(title: string, description: string = ""): Promise<CanvasProject | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      const userId = userData.user.id;
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .insert({
          title,
          description,
          user_id: userId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        return normalizeProject(data);
      }
      
      return null;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  }
  
  /**
   * Get all scenes for a project
   */
  async getScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
        
      if (error) throw error;
      
      return data.map(scene => normalizeScene(scene));
    } catch (error) {
      console.error("Error getting scenes:", error);
      throw error;
    }
  }
  
  /**
   * Create a new scene
   */
  async createScene(projectId: string, data: Partial<SceneData> = {}): Promise<CanvasScene | null> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    
    try {
      // Ensure scene_order is set
      if (!data.scene_order && !data.sceneOrder) {
        const { data: existingScenes } = await supabase
          .from('canvas_scenes')
          .select('scene_order')
          .eq('project_id', projectId)
          .order('scene_order', { ascending: false })
          .limit(1);
          
        const nextOrder = existingScenes && existingScenes.length > 0
          ? (existingScenes[0].scene_order || 0) + 1
          : 1;
          
        data.scene_order = nextOrder;
      }
      
      // Map the data to database columns
      const dbData = {
        project_id: projectId,
        title: data.title || "New Scene",
        description: data.description || "",
        script: data.script || "",
        image_prompt: data.imagePrompt || data.image_prompt || "",
        image_url: data.imageUrl || data.image_url || "",
        video_url: data.videoUrl || data.video_url || "",
        scene_order: data.scene_order || data.sceneOrder || 1,
        voice_over_text: data.voiceOverText || data.voice_over_text || "",
        product_image_url: data.productImageUrl || "",
        voice_over_url: data.voiceOverUrl || "",
        background_music_url: data.backgroundMusicUrl || "",
        duration: data.duration || 0
      };
      
      const { data: newScene, error } = await supabase
        .from('canvas_scenes')
        .insert(dbData)
        .select()
        .single();
        
      if (error) throw error;
      
      if (newScene) {
        return normalizeScene(newScene);
      }
      
      return null;
    } catch (error) {
      console.error("Error creating scene:", error);
      throw error;
    }
  }
  
  /**
   * Update a scene
   */
  async updateScene(sceneId: string, updates: Partial<CanvasScene>): Promise<boolean> {
    try {
      // Map the updates to database columns
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.script !== undefined) dbUpdates.script = updates.script;
      if (updates.imagePrompt !== undefined) dbUpdates.image_prompt = updates.imagePrompt;
      if (updates.image_prompt !== undefined) dbUpdates.image_prompt = updates.image_prompt;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.video_url !== undefined) dbUpdates.video_url = updates.video_url;
      if (updates.sceneOrder !== undefined) dbUpdates.scene_order = updates.sceneOrder;
      if (updates.scene_order !== undefined) dbUpdates.scene_order = updates.scene_order;
      if (updates.voiceOverText !== undefined) dbUpdates.voice_over_text = updates.voiceOverText;
      if (updates.voice_over_text !== undefined) dbUpdates.voice_over_text = updates.voice_over_text;
      if (updates.productImageUrl !== undefined) dbUpdates.product_image_url = updates.productImageUrl;
      if (updates.product_image_url !== undefined) dbUpdates.product_image_url = updates.product_image_url;
      if (updates.voiceOverUrl !== undefined) dbUpdates.voice_over_url = updates.voiceOverUrl;
      if (updates.voice_over_url !== undefined) dbUpdates.voice_over_url = updates.voice_over_url;
      if (updates.backgroundMusicUrl !== undefined) dbUpdates.background_music_url = updates.backgroundMusicUrl;
      if (updates.background_music_url !== undefined) dbUpdates.background_music_url = updates.background_music_url;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(dbUpdates)
        .eq('id', sceneId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error updating scene:", error);
      return false;
    }
  }
}
