
// Add or extend this file with the necessary Canvas project types
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  userId?: string;
  user_id?: string;
  fullScript?: string;
  full_script?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
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
  image_prompt?: string;
  imageUrl?: string;
  image_url?: string;
  productImageUrl?: string;
  product_image_url?: string;
  videoUrl?: string;
  video_url?: string;
  voiceOverUrl?: string;
  voice_over_url?: string;
  voiceOverText?: string;
  voice_over_text?: string;
  backgroundMusicUrl?: string;
  background_music_url?: string;
  scene_order?: number;
  sceneOrder?: number;
  order?: number; // Alias for scene_order
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
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
  'script' | 
  'imagePrompt' | 
  'description' | 
  'image' | 
  'imageUrl' |
  'videoUrl' |
  'productImage' | 
  'video' | 
  'voiceOver' | 
  'backgroundMusic' | 
  'voiceOverText';

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
