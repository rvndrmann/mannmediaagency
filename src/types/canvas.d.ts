
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
  final_video_url?: string;
  full_script?: string;
  main_product_image_url?: string;
  project_assets?: ProjectAsset[];
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Aliases for compatibility
  fullScript?: string; 
  createdAt?: string; 
  updatedAt?: string; 
  userId?: string;
  scenes?: CanvasScene[]; 
  cover_image_url?: string;
}

export interface ProjectAsset {
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
}

export interface CanvasScene {
  id: string;
  project_id: string;
  projectId?: string; // For compatibility
  title?: string;
  description?: string;
  script?: string;
  image_prompt?: string;
  imagePrompt?: string; // For compatibility
  image_url?: string;
  imageUrl?: string; // For compatibility
  video_url?: string;
  videoUrl?: string; // For compatibility
  scene_order?: number;
  sceneOrder?: number; // For compatibility
  created_at?: string;
  updated_at?: string;
  createdAt?: string; 
  updatedAt?: string; 
  voice_over_text?: string;
  voiceOverText?: string; 
  product_image_url?: string;
  productImageUrl?: string; // For compatibility
  voiceOverUrl?: string;
  voice_over_url?: string;
  background_music_url?: string;
  backgroundMusicUrl?: string; // For compatibility
  duration?: number;
  order?: number;
  scene_image_v1_url?: string;
  sceneImageV1Url?: string;
  scene_image_v2_url?: string;
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

export type UpdateSceneFunction = (
  sceneId: string,
  type: SceneUpdateType,
  value: string
) => Promise<void>;

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
