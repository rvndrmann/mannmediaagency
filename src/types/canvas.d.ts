
export interface SceneData {
  id?: string;
  projectId: string;
  title?: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  image_prompt?: string; // API compatibility
  imageUrl?: string;
  image_url?: string; // API compatibility
  videoUrl?: string;
  video_url?: string; // API compatibility
  sceneOrder?: number;
  scene_order?: number; // API compatibility
  createdAt?: string;
  created_at?: string; // API compatibility
  updatedAt?: string;
  updated_at?: string; // API compatibility
  voiceOver?: string;
  voiceOverText?: string;
  voice_over_text?: string; // API compatibility
  productImageUrl?: string;
  product_image_url?: string; // API compatibility
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  background_music_url?: string; // API compatibility
  duration?: number;
  order?: number;
}

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  full_script?: string;
  
  // Aliases for compatibility
  fullScript?: string; 
  createdAt?: string; 
  updatedAt?: string; 
  userId?: string;
  scenes?: CanvasScene[]; 
}

export interface CanvasScene {
  id: string;
  projectId: string;
  project_id?: string; // For API compatibility
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  image_prompt?: string; // For API compatibility
  imageUrl?: string;
  image_url?: string; // For API compatibility
  videoUrl?: string;
  video_url?: string; // For API compatibility
  sceneOrder?: number;
  scene_order?: number; // For API compatibility
  created_at?: string;
  updated_at?: string;
  createdAt?: string; // Alias for created_at for compatibility
  updatedAt?: string; // Alias for updated_at for compatibility
  voice_over_text?: string;
  voiceOverText?: string; // Alias for voice_over_text for compatibility
  productImageUrl?: string;
  product_image_url?: string; // For API compatibility
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  background_music_url?: string; // For API compatibility
  duration?: number;
  order?: number; // Alias for sceneOrder/scene_order
  sceneImageV1Url?: string;
  sceneImageV2Url?: string;
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

// Comprehensive list of all possible update types
export type SceneUpdateType = 
  | 'description' 
  | 'script' 
  | 'image' 
  | 'video' 
  | 'imagePrompt' 
  | 'voiceOver'  
  | 'voiceOverText'
  | 'productImage'
  | 'backgroundMusic'
  | 'sceneImageV1'
  | 'sceneImageV2'
  | 'voiceoverAudioUrl';

// Define update function type with the complete SceneUpdateType
export type UpdateSceneFunction = (
  sceneId: string,
  type: SceneUpdateType,
  value: string
) => Promise<void>;

// Add workflow types
export interface WorkflowState {
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStage?: string;
  stageResults?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  completedStages?: string[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  sceneStatuses?: Record<string, any>;
}

export type WorkflowStage = string;
