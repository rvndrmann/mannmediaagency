
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
  voiceOverText?: string;
  productImageUrl?: string;
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
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
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  duration?: number;
  order?: number; // Alias for sceneOrder/scene_order
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
  | 'sceneImageV1' // Added for Scene Image V1 upload
  | 'sceneImageV2'; // Added for Scene Image V2 upload

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
