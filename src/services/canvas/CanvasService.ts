
import { supabase } from "@/integrations/supabase/client";
import { MCPService } from "@/services/mcp/MCPService";
import { CanvasProject, CanvasScene, CanvasSceneMedia } from "@/types/canvas";

export class CanvasService {
  // Get all canvas projects for the current user
  static async getProjects(): Promise<CanvasProject[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as CanvasProject[];
    } catch (error) {
      console.error("Error fetching canvas projects:", error);
      return [];
    }
  }

  // Create a new canvas project
  static async createProject(title: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .insert([
          { title }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data as CanvasProject;
    } catch (error) {
      console.error("Error creating canvas project:", error);
      return null;
    }
  }

  // Get a specific canvas project by ID
  static async getProject(projectId: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as CanvasProject;
    } catch (error) {
      console.error(`Error fetching canvas project ${projectId}:`, error);
      return null;
    }
  }

  // Update a canvas project
  static async updateProject(projectId: string, updates: Partial<CanvasProject>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update(updates)
        .eq('id', projectId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error updating canvas project ${projectId}:`, error);
      return false;
    }
  }

  // Delete a canvas project
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      // First, delete all scenes associated with the project
      await this.deleteAllScenes(projectId);
      
      // Then delete the project itself
      const { error } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting canvas project ${projectId}:`, error);
      return false;
    }
  }

  // Get all scenes for a specific project
  static async getScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence', { ascending: true });
      
      if (error) throw error;
      return data as CanvasScene[];
    } catch (error) {
      console.error(`Error fetching scenes for project ${projectId}:`, error);
      return [];
    }
  }

  // Create a new scene for a project
  static async createScene(projectId: string, sceneData: Partial<CanvasScene>): Promise<CanvasScene | null> {
    try {
      // Get the current highest sequence number for the project
      const { data: scenes, error: sceneError } = await supabase
        .from('canvas_scenes')
        .select('sequence')
        .eq('project_id', projectId)
        .order('sequence', { ascending: false })
        .limit(1);
      
      if (sceneError) throw sceneError;
      
      // Set the sequence to be one higher than the current highest
      const sequence = scenes && scenes.length > 0 ? (scenes[0].sequence || 0) + 1 : 0;
      
      // Create the new scene
      const { data, error } = await supabase
        .from('canvas_scenes')
        .insert([
          { 
            project_id: projectId,
            sequence,
            ...sceneData
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data as CanvasScene;
    } catch (error) {
      console.error(`Error creating scene for project ${projectId}:`, error);
      return null;
    }
  }

  // Update a specific scene
  static async updateScene(
    sceneId: string, 
    type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', 
    value: string
  ): Promise<boolean> {
    try {
      const updates: Partial<CanvasScene> = {};
      
      switch(type) {
        case 'script':
          updates.script = value;
          break;
        case 'imagePrompt':
          updates.image_prompt = value;
          break;
        case 'description':
          updates.description = value;
          break;
        case 'voiceOverText':
          updates.voiceover_text = value;
          break;
        case 'image':
          updates.image_url = value;
          break;
        case 'video':
          updates.video_url = value;
          break;
      }
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(updates)
        .eq('id', sceneId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error updating scene ${sceneId}:`, error);
      return false;
    }
  }

  // Delete a specific scene
  static async deleteScene(sceneId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting scene ${sceneId}:`, error);
      return false;
    }
  }

  // Delete all scenes for a project
  static async deleteAllScenes(projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('project_id', projectId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting all scenes for project ${projectId}:`, error);
      return false;
    }
  }

  // Generate image for a scene using AI
  static async generateSceneImage(sceneId: string, imagePrompt: string): Promise<string | null> {
    try {
      // Get the scene to get the project ID
      const { data: scene, error: sceneError } = await supabase
        .from('canvas_scenes')
        .select('project_id')
        .eq('id', sceneId)
        .single();
      
      if (sceneError) throw sceneError;
      
      // Check if we have an MCP connection for this project
      const connection = MCPService.getConnectionForProject(scene.project_id);
      
      if (connection && connection.isConnected()) {
        // Use MCP connection to generate image
        // This would be implemented based on your specific MCP tool setup
        console.log("Using MCP connection to generate image");
        
        // For now, we'll just use a placeholder
        const imageUrl = "https://via.placeholder.com/800x450?text=AI+Generated+Image";
        
        // Update the scene with the new image URL
        await this.updateScene(sceneId, 'image', imageUrl);
        
        return imageUrl;
      } else {
        // Fallback to using the Supabase edge function
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            prompt: imagePrompt,
            sceneId
          }
        });
        
        if (error) throw error;
        
        // Update the scene with the new image URL
        if (data && data.imageUrl) {
          await this.updateScene(sceneId, 'image', data.imageUrl);
          return data.imageUrl;
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error generating image for scene ${sceneId}:`, error);
      return null;
    }
  }

  // Generate video for a scene using AI
  static async generateSceneVideo(sceneId: string, imageUrl: string, voiceoverText: string): Promise<string | null> {
    try {
      // Get the scene to get the project ID
      const { data: scene, error: sceneError } = await supabase
        .from('canvas_scenes')
        .select('project_id')
        .eq('id', sceneId)
        .single();
      
      if (sceneError) throw sceneError;
      
      // Check if we have an MCP connection for this project
      const connection = MCPService.getConnectionForProject(scene.project_id);
      
      if (connection && connection.isConnected()) {
        // Use MCP connection to generate video
        // This would be implemented based on your specific MCP tool setup
        console.log("Using MCP connection to generate video");
        
        // For now, we'll just use a placeholder
        const videoUrl = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4";
        
        // Update the scene with the new video URL
        await this.updateScene(sceneId, 'video', videoUrl);
        
        return videoUrl;
      } else {
        // Fallback to using the Supabase edge function
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { 
            imageUrl,
            voiceoverText,
            sceneId
          }
        });
        
        if (error) throw error;
        
        // Update the scene with the new video URL
        if (data && data.videoUrl) {
          await this.updateScene(sceneId, 'video', data.videoUrl);
          return data.videoUrl;
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error generating video for scene ${sceneId}:`, error);
      return null;
    }
  }

  // Generate a text description for a scene using AI
  static async generateSceneDescription(sceneId: string, prompt: string): Promise<string | null> {
    try {
      // Get the scene to get the project ID
      const { data: scene, error: sceneError } = await supabase
        .from('canvas_scenes')
        .select('project_id')
        .eq('id', sceneId)
        .single();
      
      if (sceneError) throw sceneError;
      
      // Check if we have an MCP connection for this project
      const connection = MCPService.getConnectionForProject(scene.project_id);
      
      if (connection && connection.isConnected()) {
        // Use MCP connection to generate description
        // This would be implemented based on your specific MCP tool setup
        console.log("Using MCP connection to generate description");
        
        // For now, we'll just use a placeholder
        const description = "This is an AI-generated scene description based on your prompt.";
        
        // Update the scene with the new description
        await this.updateScene(sceneId, 'description', description);
        
        return description;
      } else {
        // Fallback to using the Supabase edge function
        const { data, error } = await supabase.functions.invoke('generate-text', {
          body: { 
            prompt,
            type: 'description',
            sceneId
          }
        });
        
        if (error) throw error;
        
        // Update the scene with the new description
        if (data && data.text) {
          await this.updateScene(sceneId, 'description', data.text);
          return data.text;
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error generating description for scene ${sceneId}:`, error);
      return null;
    }
  }

  // Upload media for a scene
  static async uploadSceneMedia(
    projectId: string, 
    sceneId: string,
    file: File,
    type: 'image' | 'video' | 'audio'
  ): Promise<CanvasSceneMedia | null> {
    try {
      const fileName = `${projectId}/${sceneId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('canvas-media')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('canvas-media')
        .getPublicUrl(fileName);
      
      // Create a record in the database
      const { data, error } = await supabase
        .from('canvas_scene_media')
        .insert([
          {
            scene_id: sceneId,
            media_type: type,
            media_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the scene with the new media URL
      if (type === 'image') {
        await this.updateScene(sceneId, 'image', publicUrl);
      } else if (type === 'video') {
        await this.updateScene(sceneId, 'video', publicUrl);
      }
      
      return data as CanvasSceneMedia;
    } catch (error) {
      console.error(`Error uploading media for scene ${sceneId}:`, error);
      return null;
    }
  }
}
