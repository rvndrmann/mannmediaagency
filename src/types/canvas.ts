
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  
  // Normalized fields with backwards compatibility
  userId: string;
  user_id?: string;
  
  fullScript?: string;
  full_script?: string;
  
  createdAt: string;
  created_at?: string;
  
  updatedAt: string;
  updated_at?: string;
  
  scenes?: CanvasScene[];
  
  productImage?: string;
  cover_image_url?: string;
  final_video_url?: string;
}

export interface CanvasScene {
  id: string;
  title: string;
  
  // Normalized script fields
  script?: string;
  
  // Normalized image prompt fields
  imagePrompt?: string;
  image_prompt?: string;
  
  description?: string;
  
  // Normalized media fields
  image?: string;
  imageUrl?: string;
  image_url?: string;
  
  video?: string;
  videoUrl?: string;
  video_url?: string;
  
  voiceOver?: string;
  voiceOverText?: string;
  voice_over_text?: string;
  
  backgroundMusic?: string;
  backgroundMusicUrl?: string;
  background_music_url?: string;
  
  // Project relationship fields
  projectId: string;
  project_id?: string;
  
  // Normalized timestamp fields
  createdAt: string;
  created_at?: string;
  
  updatedAt: string;
  updated_at?: string;
  
  // Normalized order fields
  scene_order?: number;
  sceneOrder?: number;
  order?: number;
  
  // Additional fields for compatibility
  productImage?: string;
  productImageUrl?: string;
  product_image_url?: string;
  
  voiceOverUrl?: string;
  voice_over_url?: string;
  
  duration?: number;
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
  created_at?: string;
  
  updatedAt: string;
  updated_at?: string;
  
  completedStages?: WorkflowStage[];
  errorMessage?: string;
  
  startedAt?: string;
  start_at?: string;
  
  completedAt?: string;
  completed_at?: string;
  
  sceneStatuses?: Record<string, any>;
  progress?: number;
}

export type SceneUpdateType = 
  | 'script' 
  | 'imagePrompt' 
  | 'description' 
  | 'image' 
  | 'imageUrl'
  | 'productImage' 
  | 'video' 
  | 'voiceOver' 
  | 'backgroundMusic' 
  | 'voiceOverText';

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
  created_at?: string;
  
  updatedAt?: string;
  updated_at?: string;
  
  voiceOverText?: string;
  voice_over_text?: string;
  
  voiceOverUrl?: string;
  voice_over_url?: string;
  
  productImageUrl?: string;
  product_image_url?: string;
  
  backgroundMusicUrl?: string;
  background_music_url?: string;
  
  duration?: number;
}
