
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneData } from "@/types/canvas";

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
        // Ensure field compatibility
        const project: CanvasProject = {
          id: data.id,
          title: data.title,
          description: data.description || "",
          userId: data.user_id,
          user_id: data.user_id,
          fullScript: data.full_script || "",
          full_script: data.full_script || "",
          createdAt: data.created_at,
          created_at: data.created_at,
          updatedAt: data.updated_at,
          updated_at: data.updated_at
        };
        
        return project;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching project:", error);
      throw error;
    }
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
        // Ensure field compatibility
        const project: CanvasProject = {
          id: data.id,
          title: data.title,
          description: data.description || "",
          userId: data.user_id,
          user_id: data.user_id,
          fullScript: data.full_script || "",
          full_script: data.full_script || "",
          createdAt: data.created_at,
          created_at: data.created_at,
          updatedAt: data.updated_at,
          updated_at: data.updated_at
        };
        
        return project;
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
      
      // Ensure field compatibility for all scenes
      const scenes: CanvasScene[] = data.map(scene => ({
        id: scene.id,
        projectId: scene.project_id,
        project_id: scene.project_id,
        title: scene.title || "",
        description: scene.description || "",
        script: scene.script || "",
        imagePrompt: scene.image_prompt || "",
        image_prompt: scene.image_prompt || "",
        imageUrl: scene.image_url || "",
        image_url: scene.image_url || "",
        videoUrl: scene.video_url || "",
        video_url: scene.video_url || "",
        sceneOrder: scene.scene_order,
        scene_order: scene.scene_order,
        order: scene.scene_order,
        createdAt: scene.created_at,
        created_at: scene.created_at,
        updatedAt: scene.updated_at,
        updated_at: scene.updated_at,
        voiceOverText: scene.voice_over_text || "",
        voice_over_text: scene.voice_over_text || "",
        productImageUrl: scene.product_image_url || "",
        product_image_url: scene.product_image_url || "",
        voiceOverUrl: scene.voice_over_url || "",
        voice_over_url: scene.voice_over_url || "",
        backgroundMusicUrl: scene.background_music_url || "",
        background_music_url: scene.background_music_url || "",
        duration: scene.duration || 0
      }));
      
      return scenes;
    } catch (error) {
      console.error("Error getting scenes:", error);
      throw error;
    }
  }
  
  /**
   * Create a new scene
   */
  async createScene(data: Partial<SceneData>): Promise<CanvasScene | null> {
    if (!data.projectId && !data.project_id) {
      throw new Error("Project ID is required");
    }
    
    const projectId = data.projectId || data.project_id;
    
    try {
      // Ensure scene_order is set
      if (!data.scene_order && !data.sceneOrder && !data.order) {
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
        image_prompt: data.imagePrompt || "",
        image_url: data.imageUrl || "",
        video_url: data.videoUrl || "",
        scene_order: data.scene_order || data.sceneOrder || data.order || 1,
        voice_over_text: data.voiceOverText || "",
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
        // Ensure field compatibility
        return {
          id: newScene.id,
          projectId: newScene.project_id,
          project_id: newScene.project_id,
          title: newScene.title || "",
          description: newScene.description || "",
          script: newScene.script || "",
          imagePrompt: newScene.image_prompt || "",
          image_prompt: newScene.image_prompt || "",
          imageUrl: newScene.image_url || "",
          image_url: newScene.image_url || "",
          videoUrl: newScene.video_url || "",
          video_url: newScene.video_url || "",
          sceneOrder: newScene.scene_order,
          scene_order: newScene.scene_order,
          order: newScene.scene_order,
          createdAt: newScene.created_at,
          created_at: newScene.created_at,
          updatedAt: newScene.updated_at,
          updated_at: newScene.updated_at,
          voiceOverText: newScene.voice_over_text || "",
          voice_over_text: newScene.voice_over_text || "",
          productImageUrl: newScene.product_image_url || "",
          product_image_url: newScene.product_image_url || "",
          voiceOverUrl: newScene.voice_over_url || "",
          voice_over_url: newScene.voice_over_url || "",
          backgroundMusicUrl: newScene.background_music_url || "",
          background_music_url: newScene.background_music_url || "",
          duration: newScene.duration || 0
        };
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
      if (updates.order !== undefined) dbUpdates.scene_order = updates.order;
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
