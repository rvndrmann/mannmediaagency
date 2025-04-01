
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  fullScript?: string;
  scenes?: CanvasScene[];
  productImage?: string;
  cover_image_url?: string;
  final_video_url?: string;
}

export interface CanvasScene {
  id: string;
  title: string;
  script?: string;
  imagePrompt?: string;
  description?: string;
  image?: string;
  video?: string;
  voiceOver?: string;
  voiceOverText?: string;
  backgroundMusic?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  scene_order?: number;
  productImage?: string;
  // Add these for backwards compatibility
  imageUrl?: string;
  videoUrl?: string;
  productImageUrl?: string;
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  duration?: number;
  project_id?: string;
  order?: number;
}

export type WorkflowStage = 
  | 'planning' 
  | 'script_writing'
  | 'scene_generation'
  | 'image_generation'
  | 'video_generation'
  | 'audio_generation'
  | 'final_compilation';

export interface WorkflowState {
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  currentStage?: WorkflowStage;
  stageResults?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedStages?: WorkflowStage[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  sceneStatuses?: Record<string, any>;
  progress?: number;
}

// Update to a string union type instead of an enum for better compatibility
export type SceneUpdateType = 
  | 'script' 
  | 'imagePrompt' 
  | 'description' 
  | 'image' 
  | 'productImage' 
  | 'video' 
  | 'voiceOver' 
  | 'backgroundMusic' 
  | 'voiceOverText';

// Add this type for backwards compatibility
export interface SceneData {
  id?: string;
  projectId: string;
  project_id?: string;
  title?: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  image_prompt?: string;
  imageUrl?: string;
  image_url?: string;
  videoUrl?: string;
  video_url?: string;
  sceneOrder?: number;
  scene_order?: number;
  createdAt?: string;
  updatedAt?: string;
  voiceOverText?: string;
  voice_over_text?: string;
}
