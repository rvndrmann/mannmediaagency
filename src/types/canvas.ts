
// Add or extend this file with the necessary Canvas project types
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  userId?: string;
  user_id?: string; // For API compatibility
  fullScript?: string;
  full_script?: string; // For API compatibility
  createdAt?: string;
  created_at?: string; // For API compatibility
  updatedAt?: string;
  updated_at?: string; // For API compatibility
  scenes?: CanvasScene[];
  cover_image_url?: string;
}

export interface CanvasScene {
  id: string;
  project_id: string;
  projectId?: string; // Alias for project_id
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  image_prompt?: string; // For API compatibility
  imageUrl?: string;
  image_url?: string; // For API compatibility
  productImageUrl?: string;
  product_image_url?: string; // For API compatibility
  videoUrl?: string;
  video_url?: string; // For API compatibility
  voiceOverUrl?: string;
  voice_over_url?: string; // For API compatibility
  voiceOverText?: string;
  voice_over_text?: string; // For API compatibility
  backgroundMusicUrl?: string;
  background_music_url?: string; // For API compatibility
  scene_order?: number;
  sceneOrder?: number; // Alias for scene_order
  order?: number; // Alias for scene_order/sceneOrder
  createdAt?: string;
  created_at?: string; // For API compatibility
  updatedAt?: string;
  updated_at?: string; // For API compatibility
  duration?: number;
}

export interface SceneData {
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceOverUrl?: string;
  voiceOverText?: string;
  backgroundMusicUrl?: string;
  scene_order?: number;
  projectId?: string;
  project_id?: string;
}

export type SceneUpdateType = 
  | 'script' 
  | 'imagePrompt' 
  | 'description' 
  | 'image' 
  | 'imageUrl' 
  | 'videoUrl' 
  | 'productImage' 
  | 'video' 
  | 'voiceOver' 
  | 'backgroundMusic' 
  | 'voiceOverText';

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
