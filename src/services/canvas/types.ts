
export interface SceneData {
  id?: string;
  projectId: string;
  title?: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  sceneOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  userId?: string; // Add this for compatibility
  full_script?: string;
  fullScript?: string; // Add this for compatibility
  createdAt?: string; // Add this for compatibility
  updatedAt?: string; // Add this for compatibility 
  scenes?: any[];
}

export interface CanvasScene {
  id: string;
  project_id: string;
  projectId?: string; // Add for compatibility
  title?: string;
  description?: string;
  script?: string;
  image_prompt?: string;
  imagePrompt?: string; // Add for compatibility
  image_url?: string;
  imageUrl?: string; // Add for compatibility 
  video_url?: string;
  videoUrl?: string; // Add for compatibility
  scene_order?: number;
  sceneOrder?: number; // Add for compatibility
  created_at?: string;
  createdAt?: string; // Add for compatibility
  updated_at?: string;
  updatedAt?: string; // Add for compatibility
  voiceOverText?: string;
  voice_over_text?: string; // Add snake_case
  productImageUrl?: string; // Add missing field
  product_image_url?: string; // Add missing field
  voiceOverUrl?: string; // Add missing field
  voice_over_url?: string; // Add missing field
  backgroundMusicUrl?: string; // Add missing field
  background_music_url?: string; // Add missing field
  duration?: number; // Add missing field
  sceneImageV1Url?: string; // Add V1
  scene_image_v1_url?: string; // Add V1 snake_case
  sceneImageV2Url?: string; // Add V2
  scene_image_v2_url?: string; // Add V2 snake_case
}

export interface SceneUpdateParams {
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
}

export interface ImageGenerationParams {
  sceneId: string;
  prompt?: string;
  version?: string;
}

export interface VideoGenerationParams {
  sceneId: string;
  aspectRatio?: string;
}

// Add a type for scene update operations
export type SceneUpdateType =
  | 'script'
  | 'imagePrompt'
  | 'description'
  | 'image'
  | 'imageUrl' // Added for consistency
  | 'productImage'
  | 'video'
  | 'voiceOver'
  | 'backgroundMusic'
  | 'voiceOverText'
  | 'sceneImageV1' // Added for Scene Image V1 upload
  | 'sceneImageV2'; // Added for Scene Image V2 upload
