import { CanvasProject, CanvasScene, SceneData, SceneUpdateType } from '@/types/canvas';

/**
 * Normalize a Canvas project object to ensure all properties are defined consistently
 */
export function normalizeProject(project: any): CanvasProject {
  return {
    id: project.id,
    title: project.title || 'Untitled Project',
    description: project.description || '',
    userId: project.userId || project.user_id || '',
    user_id: project.user_id || project.userId || '',
    fullScript: project.fullScript || project.full_script || '',
    full_script: project.full_script || project.fullScript || '',
    final_video_url: project.final_video_url || null,
    main_product_image_url: project.main_product_image_url || null,
    createdAt: project.createdAt || project.created_at || new Date().toISOString(),
    created_at: project.created_at || project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.updated_at || new Date().toISOString(),
    updated_at: project.updated_at || project.updatedAt || new Date().toISOString(),
    cover_image_url: project.cover_image_url || '',
    project_assets: project.project_assets || [],
    scenes: (project.canvas_scenes || []).map(scene => normalizeScene(scene))
  };
}

/**
 * Normalize a Canvas scene object to ensure all properties are defined consistently
 */
export function normalizeScene(scene: any): CanvasScene {
  return {
    id: scene.id,
    project_id: scene.project_id || scene.projectId || '',
    projectId: scene.projectId || scene.project_id || '',
    title: scene.title || 'Untitled Scene',
    description: scene.description || '',
    script: scene.script || '',
    imagePrompt: scene.imagePrompt || scene.image_prompt || '',
    image_prompt: scene.image_prompt || scene.imagePrompt || '',
    imageUrl: scene.imageUrl || scene.image_url || '',
    image_url: scene.image_url || scene.imageUrl || '',
    productImageUrl: scene.productImageUrl || scene.product_image_url || '',
    product_image_url: scene.product_image_url || scene.productImageUrl || '',
    videoUrl: scene.videoUrl || scene.video_url || '',
    video_url: scene.video_url || scene.videoUrl || '',
    voiceOverUrl: scene.voiceOverUrl || scene.voice_over_url || '',
    voice_over_url: scene.voice_over_url || scene.voiceOverUrl || '',
    voiceOverText: scene.voiceOverText || scene.voice_over_text || '',
    voice_over_text: scene.voice_over_text || scene.voiceOverText || '',
    backgroundMusicUrl: scene.backgroundMusicUrl || scene.background_music_url || '',
    background_music_url: scene.background_music_url || scene.backgroundMusicUrl || '',
    sceneImageV1Url: scene.sceneImageV1Url || scene.scene_image_v1_url || '',
    scene_image_v1_url: scene.scene_image_v1_url || scene.sceneImageV1Url || '',
    sceneImageV2Url: scene.sceneImageV2Url || scene.scene_image_v2_url || '',
    scene_image_v2_url: scene.scene_image_v2_url || scene.sceneImageV2Url || '',
    sceneOrder: scene.sceneOrder || scene.scene_order || 0,
    scene_order: scene.scene_order || scene.sceneOrder || 0,
    duration: scene.duration || 0,
    createdAt: scene.createdAt || scene.created_at || new Date().toISOString(),
    created_at: scene.created_at || scene.createdAt || new Date().toISOString(),
    updatedAt: scene.updatedAt || scene.updated_at || new Date().toISOString(),
    updated_at: scene.updated_at || scene.updatedAt || new Date().toISOString(),
    bria_v2_request_id: scene.bria_v2_request_id || null,
    custom_instruction: scene.custom_instruction || null,
    image_guidance_settings: scene.image_guidance_settings || null,
    // Add compatibility fields for old references
    image: scene.image || scene.imageUrl || scene.image_url || '',
    video: scene.video || scene.videoUrl || scene.video_url || '',
    voiceOver: scene.voiceOver || scene.voiceOverUrl || scene.voice_over_url || '',
    backgroundMusic: scene.backgroundMusic || scene.backgroundMusicUrl || scene.background_music_url || '',
    productImage: scene.productImage || scene.productImageUrl || scene.product_image_url || '',
    // Add normalization for voiceover audio URL
    voiceover_audio_url: scene.voiceover_audio_url || scene.voiceoverAudioUrl || null,
    voiceoverAudioUrl: scene.voiceoverAudioUrl || scene.voiceover_audio_url || null
  };
}

/**
 * Extract scenes from a project and normalize them
 */
export function extractAndNormalizeScenes(project: any): CanvasScene[] {
  if (!project || !project.scenes || !Array.isArray(project.scenes)) {
    return [];
  }
  
  return project.scenes.map(scene => normalizeScene({
    ...scene,
    project_id: project.id,
    projectId: project.id
  }));
}

/**
 * Map a scene update type to the corresponding property name in the database
 */
export function mapSceneUpdateTypeToDbField(updateType: SceneUpdateType): string {
  const mapping: Record<string, string> = {
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
  
  return mapping[updateType] || updateType;
}

/**
 * Map a scene update type to the corresponding property in the CanvasScene object
 */
export function mapSceneUpdateTypeToProperty(updateType: SceneUpdateType): keyof CanvasScene {
  const mapping: Partial<Record<SceneUpdateType, keyof CanvasScene>> = {
    'script': 'script',
    'imagePrompt': 'imagePrompt',
    'description': 'description',
    'image': 'imageUrl',
    'productImage': 'productImageUrl',
    'video': 'videoUrl',
    'voiceOver': 'voiceOverUrl',
    'backgroundMusic': 'backgroundMusicUrl',
    'voiceOverText': 'voiceOverText'
  };
  
  return mapping[updateType] as keyof CanvasScene;
}

/**
 * Convert a scene update type and value to a database update object
 */
export function createSceneUpdateObject(updateType: SceneUpdateType, value: string): Record<string, string> {
  const dbField = mapSceneUpdateTypeToDbField(updateType);
  return { [dbField]: value };
}

/**
 * Check if a scene is ready for image generation
 */
export function isSceneReadyForImageGeneration(scene: CanvasScene): boolean {
  return !!(
    scene && 
    scene.id && 
    scene.script && 
    scene.description && 
    scene.imagePrompt && 
    !scene.imageUrl
  );
}

/**
 * Check if a scene is ready for video generation
 */
export function isSceneReadyForVideoGeneration(scene: CanvasScene): boolean {
  return !!(
    scene && 
    scene.id && 
    scene.script && 
    scene.description && 
    scene.imageUrl && 
    !scene.videoUrl
  );
}
