
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject, CanvasScene, ImageGenerationParams, SceneData, SceneUpdateParams, VideoGenerationParams } from "./types";
import { MCPService } from "../mcp/MCPService";

export class CanvasService {
  private static instance: CanvasService;
  
  private constructor() {}
  
  static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }
  
  async getProjects(userId: string): Promise<CanvasProject[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching Canvas projects:", error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error("Error in getProjects:", error);
      return [];
    }
  }
  
  async getProject(projectId: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (error) {
        console.error("Error fetching Canvas project:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getProject:", error);
      return null;
    }
  }
  
  async createProject(title: string, userId: string, description?: string): Promise<CanvasProject | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .insert({
          title,
          description,
          user_id: userId
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error creating Canvas project:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in createProject:", error);
      return null;
    }
  }
  
  async updateProject(projectId: string, updates: Partial<CanvasProject>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update(updates)
        .eq('id', projectId);
        
      if (error) {
        console.error("Error updating Canvas project:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateProject:", error);
      return false;
    }
  }
  
  async getScenes(projectId: string): Promise<CanvasScene[]> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
        
      if (error) {
        console.error("Error fetching Canvas scenes:", error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error("Error in getScenes:", error);
      return [];
    }
  }
  
  async getScene(sceneId: string): Promise<CanvasScene | null> {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
        
      if (error) {
        console.error("Error fetching Canvas scene:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getScene:", error);
      return null;
    }
  }
  
  async createScene(projectId: string, data: Partial<SceneData> = {}): Promise<CanvasScene | null> {
    try {
      // Get max scene order
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: false })
        .limit(1);
        
      const maxOrder = scenesError || !scenes || scenes.length === 0 
        ? 0 
        : (scenes[0].scene_order || 0);
      
      const { data: newScene, error } = await supabase
        .from('canvas_scenes')
        .insert({
          project_id: projectId,
          title: data.title || 'New Scene',
          description: data.description || '',
          script: data.script || '',
          image_prompt: data.imagePrompt || '',
          scene_order: maxOrder + 1
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error creating Canvas scene:", error);
        return null;
      }
      
      return newScene;
    } catch (error) {
      console.error("Error in createScene:", error);
      return null;
    }
  }
  
  async updateScene(sceneId: string, updates: SceneUpdateParams): Promise<boolean> {
    try {
      // Convert our API format to database format
      const dbUpdates: Partial<CanvasScene> = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.script !== undefined && { script: updates.script }),
        ...(updates.imagePrompt !== undefined && { image_prompt: updates.imagePrompt })
      };
      
      const { error } = await supabase
        .from('canvas_scenes')
        .update(dbUpdates)
        .eq('id', sceneId);
        
      if (error) {
        console.error("Error updating Canvas scene:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateScene:", error);
      return false;
    }
  }
  
  async updateSceneDescription(sceneId: string, useMcp: boolean = true): Promise<boolean> {
    try {
      // Get the scene first
      const scene = await this.getScene(sceneId);
      if (!scene) {
        throw new Error("Scene not found");
      }
      
      if (useMcp) {
        // Try to use MCP for this operation
        const mcpService = MCPService.getInstance();
        const connection = await mcpService.getConnectionForProject(scene.project_id);
        
        if (connection) {
          // Call the MCP tool
          const result = await connection.callTool("update_scene_description", {
            sceneId,
            imageAnalysis: true
          });
          
          return result.success;
        }
      }
      
      // Fallback to Edge Function
      const { data, error } = await supabase.functions.invoke("canvas-scene-agent", {
        body: {
          sceneId,
          type: "description",
          projectId: scene.project_id
        }
      });
      
      if (error) {
        console.error("Error updating scene description:", error);
        return false;
      }
      
      return data.success || false;
    } catch (error) {
      console.error("Error in updateSceneDescription:", error);
      return false;
    }
  }
  
  async updateImagePrompt(sceneId: string, useMcp: boolean = true): Promise<boolean> {
    try {
      // Get the scene first
      const scene = await this.getScene(sceneId);
      if (!scene) {
        throw new Error("Scene not found");
      }
      
      if (useMcp) {
        // Try to use MCP for this operation
        const mcpService = MCPService.getInstance();
        const connection = await mcpService.getConnectionForProject(scene.project_id);
        
        if (connection) {
          // Call the MCP tool
          const result = await connection.callTool("update_image_prompt", {
            sceneId,
            useDescription: true
          });
          
          return result.success;
        }
      }
      
      // Fallback to Edge Function
      const { data, error } = await supabase.functions.invoke("canvas-scene-agent", {
        body: {
          sceneId,
          type: "imagePrompt",
          projectId: scene.project_id
        }
      });
      
      if (error) {
        console.error("Error updating image prompt:", error);
        return false;
      }
      
      return data.success || false;
    } catch (error) {
      console.error("Error in updateImagePrompt:", error);
      return false;
    }
  }
  
  async generateImage(params: ImageGenerationParams, useMcp: boolean = true): Promise<boolean> {
    try {
      // Get the scene first
      const scene = await this.getScene(params.sceneId);
      if (!scene) {
        throw new Error("Scene not found");
      }
      
      if (useMcp) {
        // Try to use MCP for this operation
        const mcpService = MCPService.getInstance();
        const connection = await mcpService.getConnectionForProject(scene.project_id);
        
        if (connection) {
          // Call the MCP tool
          const result = await connection.callTool("generate_scene_image", {
            sceneId: params.sceneId,
            productShotVersion: params.version || "v2"
          });
          
          return result.success;
        }
      }
      
      // Fallback to Edge Function
      const { data, error } = await supabase.functions.invoke("product-shot", {
        body: {
          sceneId: params.sceneId,
          prompt: params.prompt,
          projectId: scene.project_id,
          version: params.version || "v2"
        }
      });
      
      if (error) {
        console.error("Error generating image:", error);
        return false;
      }
      
      return data.success || false;
    } catch (error) {
      console.error("Error in generateImage:", error);
      return false;
    }
  }
  
  async generateVideo(params: VideoGenerationParams, useMcp: boolean = true): Promise<boolean> {
    try {
      // Get the scene first
      const scene = await this.getScene(params.sceneId);
      if (!scene) {
        throw new Error("Scene not found");
      }
      
      if (useMcp) {
        // Try to use MCP for this operation
        const mcpService = MCPService.getInstance();
        const connection = await mcpService.getConnectionForProject(scene.project_id);
        
        if (connection) {
          // Call the MCP tool
          const result = await connection.callTool("create_scene_video", {
            sceneId: params.sceneId,
            aspectRatio: params.aspectRatio || "16:9"
          });
          
          return result.success;
        }
      }
      
      // Fallback to Edge Function
      const { data, error } = await supabase.functions.invoke("image-to-video", {
        body: {
          sceneId: params.sceneId,
          aspectRatio: params.aspectRatio || "16:9",
          projectId: scene.project_id
        }
      });
      
      if (error) {
        console.error("Error generating video:", error);
        return false;
      }
      
      return data.success || false;
    } catch (error) {
      console.error("Error in generateVideo:", error);
      return false;
    }
  }
  
  async deleteScene(sceneId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', sceneId);
        
      if (error) {
        console.error("Error deleting Canvas scene:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in deleteScene:", error);
      return false;
    }
  }
  
  async reorderScenes(projectId: string, sceneIds: string[]): Promise<boolean> {
    try {
      // Update each scene with new order
      const updates = sceneIds.map((sceneId, index) => 
        supabase
          .from('canvas_scenes')
          .update({ scene_order: index + 1 })
          .eq('id', sceneId)
      );
      
      // Execute all updates in parallel
      const results = await Promise.all(updates);
      
      // Check if any update failed
      const hasError = results.some(result => result.error);
      
      if (hasError) {
        console.error("Error reordering scenes:", results.filter(r => r.error).map(r => r.error));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in reorderScenes:", error);
      return false;
    }
  }
}
