
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from "@/types/canvas";
import { mapSceneUpdateTypeToDbField } from "@/utils/canvas-data-utils";
import { normalizeProject, normalizeScene } from "@/utils/canvas-data-utils";

export class CanvasService {
  private static instance: CanvasService;
  
  private constructor() {}
  
  public static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }
  
  // Fetch all projects for current user
  public async fetchProjects(): Promise<CanvasProject[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Normalize the projects to ensure consistent properties
      return (data || []).map(project => normalizeProject(project));
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }
  
  // Fetch a single project by ID
  public async fetchProject(projectId: string): Promise<CanvasProject | null> {
    try {
      // Get the project
      const { data: project, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      // Get the scenes for this project
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (scenesError) throw scenesError;
      
      // Normalize the project and scenes
      const normalizedProject = normalizeProject(project);
      normalizedProject.scenes = (scenes || []).map(scene => normalizeScene(scene));
      
      return normalizedProject;
    } catch (error) {
      console.error("Error fetching project:", error);
      return null;
    }
  }
  
  // Create a new project
  public async createProject(title: string, description?: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .insert([
          { 
            title, 
            description: description || '',
            full_script: ''
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      return normalizeProject(data);
    } catch (error) {
      console.error("Error creating project:", error);
      return null;
    }
  }
  
  // Update project details
  public async updateProject(projectId: string, updates: Partial<CanvasProject>): Promise<CanvasProject | null> {
    try {
      // Convert updates to match DB field names if needed
      const dbUpdates: Record<string, any> = {};
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.fullScript || updates.full_script) {
        dbUpdates.full_script = updates.fullScript || updates.full_script;
      }
      if (updates.cover_image_url) dbUpdates.cover_image_url = updates.cover_image_url;
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      
      return normalizeProject(data);
    } catch (error) {
      console.error("Error updating project:", error);
      return null;
    }
  }
  
  // Delete a project
  public async deleteProject(projectId: string): Promise<boolean> {
    try {
      // First, delete all scenes associated with this project
      const { error: sceneError } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('project_id', projectId);
      
      if (sceneError) throw sceneError;
      
      // Then, delete the project itself
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }
  
  // Fetch scenes for a project
  public async fetchScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (error) throw error;
      
      // Normalize the scenes
      const normalizedScenes = (data || []).map(scene => normalizeScene({
        ...scene,
        project_id: projectId,
        projectId: projectId
      }));
      
      return normalizedScenes;
    } catch (error) {
      console.error("Error fetching scenes:", error);
      return [];
    }
  }
  
  // Create a new scene
  public async createScene(sceneData: Partial<SceneData>): Promise<CanvasScene | null> {
    try {
      if (!sceneData.project_id && !sceneData.projectId) {
        throw new Error("Project ID is required to create a scene");
      }
      
      // Prepare the scene data
      const data = {
        project_id: sceneData.project_id || sceneData.projectId,
        title: sceneData.title || 'New Scene',
        description: sceneData.description || '',
        script: sceneData.script || '',
        image_prompt: sceneData.imagePrompt || '',
        scene_order: sceneData.scene_order || sceneData.sceneOrder || 0
      };
      
      const { data: newScene, error } = await supabase
        .from('canvas_scenes')
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      
      return normalizeScene(newScene);
    } catch (error) {
      console.error("Error creating scene:", error);
      return null;
    }
  }
  
  // Update a scene
  public async updateScene(sceneId: string, type: SceneUpdateType, value: string): Promise<boolean> {
    try {
      // Map the update type to the correct database field
      const dbField = mapSceneUpdateTypeToDbField(type);
      
      // Update the scene
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [dbField]: value })
        .eq('id', sceneId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error updating scene ${type}:`, error);
      return false;
    }
  }
  
  // Delete a scene
  public async deleteScene(sceneId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error deleting scene:", error);
      return false;
    }
  }
}
