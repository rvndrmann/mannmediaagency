
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
export type SceneUpdateType = 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video';
