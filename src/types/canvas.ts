
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
  voiceOver?: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  full_script?: string;
}

export interface CanvasScene {
  id: string;
  projectId: string;
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  sceneOrder?: number;
  created_at?: string;
  updated_at?: string;
  voice_over_text?: string;
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

// Update SceneUpdateType to include all possible update types and standardize on voiceOver
export type SceneUpdateType = 
  | 'description' 
  | 'script' 
  | 'image' 
  | 'video' 
  | 'imagePrompt' 
  | 'voiceOver'  
  | 'imageUrl'
  | 'videoUrl'
  | 'productImage'
  | 'backgroundMusic';

// Define update function type with the complete SceneUpdateType
export type UpdateSceneFunction = (
  sceneId: string,
  type: SceneUpdateType,
  value: string
) => Promise<void>;
