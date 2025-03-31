import { supabase } from "@/integrations/supabase/client";
import { CanvasScene, CanvasProject, SceneUpdateType } from "@/types/canvas";

/**
 * Utility functions for accessing and manipulating Canvas project data
 */

/**
 * Get detailed scene data by ID
 */
export async function getSceneById(sceneId: string): Promise<CanvasScene | null> {
  try {
    const { data, error } = await supabase
      .from('canvas_scenes')
      .select(`
        id, project_id, title, scene_order, script, description, 
        image_prompt, image_url, product_image_url, video_url, 
        voice_over_url, voice_over_text, background_music_url, duration, created_at, updated_at
      `)
      .eq('id', sceneId)
      .single();
      
    if (error) throw error;
    
    if (!data) return null;
    
    return {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      order: data.scene_order,
      script: data.script || "",
      description: data.description || "", 
      imagePrompt: data.image_prompt || "",
      imageUrl: data.image_url || "",
      productImageUrl: data.product_image_url || "",
      videoUrl: data.video_url || "",
      voiceOverUrl: data.voice_over_url || "", 
      backgroundMusicUrl: data.background_music_url || "",
      voiceOverText: data.voice_over_text || "", 
      duration: data.duration,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Error fetching scene:", error);
    return null;
  }
}

/**
 * Get all scenes for a project
 */
export async function getScenesByProjectId(projectId: string): Promise<CanvasScene[]> {
  try {
    const { data, error } = await supabase
      .from('canvas_scenes')
      .select(`
        id, project_id, title, scene_order, script, description, 
        image_prompt, image_url, product_image_url, video_url, 
        voice_over_url, voice_over_text, background_music_url, duration, created_at, updated_at
      `)
      .eq('project_id', projectId)
      .order('scene_order', { ascending: true });
      
    if (error) throw error;
    
    if (!data) return [];
    
    return data.map(scene => ({
      id: scene.id,
      projectId: scene.project_id,
      title: scene.title,
      order: scene.scene_order,
      script: scene.script || "",
      description: scene.description || "", 
      imagePrompt: scene.image_prompt || "",
      imageUrl: scene.image_url || "",
      productImageUrl: scene.product_image_url || "",
      videoUrl: scene.video_url || "",
      voiceOverUrl: scene.voice_over_url || "", 
      backgroundMusicUrl: scene.background_music_url || "",
      voiceOverText: scene.voice_over_text || "", 
      duration: scene.duration,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at
    }));
  } catch (error) {
    console.error("Error fetching scenes:", error);
    return [];
  }
}

/**
 * Extract relevant scene content for display in the chat
 */
export function extractSceneContent(scene: CanvasScene, contentType: SceneUpdateType | 'all' = 'all'): string {
  if (contentType === 'all') {
    let content = '';
    if (scene.script) content += `## Script\n${scene.script}\n\n`;
    if (scene.description) content += `## Description\n${scene.description}\n\n`;
    if (scene.imagePrompt) content += `## Image Prompt\n${scene.imagePrompt}\n\n`;
    if (scene.voiceOverText) content += `## Voice Over Text\n${scene.voiceOverText}\n\n`;
    return content.trim();
  }
  
  switch (contentType) {
    case 'script': return scene.script || '';
    case 'description': return scene.description || '';
    case 'imagePrompt': return scene.imagePrompt || '';
    case 'voiceOverText': return scene.voiceOverText || '';
    default: return '';
  }
}

/**
 * Format project data for display
 */
export function formatProjectData(project: CanvasProject): string {
  let content = `# ${project.title}\n\n`;
  
  if (project.description) {
    content += `## Project Description\n${project.description}\n\n`;
  }
  
  if (project.fullScript) {
    content += `## Full Script\n${project.fullScript}\n\n`;
  }
  
  content += `## Scenes (${project.scenes.length})\n`;
  project.scenes.forEach((scene, index) => {
    content += `### Scene ${index + 1}: ${scene.title}\n`;
    if (scene.script) content += `**Script:** ${scene.script.substring(0, 100)}${scene.script.length > 100 ? '...' : ''}\n`;
    content += '\n';
  });
  
  return content.trim();
}

/**
 * Update a single scene field
 */
export async function updateSceneField(
  sceneId: string, 
  fieldType: SceneUpdateType, 
  content: string
): Promise<boolean> {
  try {
    const fieldMappings: Record<SceneUpdateType, string> = {
      script: 'script',
      description: 'description',
      imagePrompt: 'image_prompt',
      voiceOverText: 'voice_over_text',
      image: 'image_url',
      productImage: 'product_image_url',
      video: 'video_url',
      voiceOver: 'voice_over_url',
      backgroundMusic: 'background_music_url'
    };
    
    const field = fieldMappings[fieldType];
    if (!field) {
      throw new Error(`Invalid field type: ${fieldType}`);
    }
    
    const { error } = await supabase
      .from('canvas_scenes')
      .update({ [field]: content })
      .eq('id', sceneId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error updating scene ${fieldType}:`, error);
    return false;
  }
}

/**
 * Update a single scene field
 */
export const updateSceneData = (scene: CanvasScene, type: SceneUpdateType, value: string): CanvasScene => {
  const updatedScene = { ...scene };

  // Map the update type to the appropriate field
  const updateMap: Record<SceneUpdateType, keyof CanvasScene> = {
    script: 'script',
    imagePrompt: 'imagePrompt',
    description: 'description',
    voiceOverText: 'voiceOverText',
    image: 'productImageUrl', // This maps to productImageUrl in the schema
    productImage: 'productImageUrl',
    video: 'videoUrl',
    voiceOver: 'voiceOverUrl',
    backgroundMusic: 'backgroundMusicUrl',
    imageUrl: 'imageUrl',
    videoUrl: 'videoUrl'
  };

  // Update the appropriate field
  const fieldToUpdate = updateMap[type];
  if (fieldToUpdate) {
    (updatedScene as any)[fieldToUpdate] = value;
  } else {
    console.error(`Unknown update type: ${type}`);
  }

  return updatedScene;
};
