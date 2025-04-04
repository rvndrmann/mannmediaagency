
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
  main_product_image_url?: string; // Added for main project image
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
  sceneImageV1Url?: string; // Added for Scene Image V1
  scene_image_v1_url?: string; // Added for Scene Image V1 (DB)
  sceneImageV2Url?: string; // Added for Scene Image V2
  scene_image_v2_url?: string; // Added for Scene Image V2 (DB)
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

  // Added field for Bria V2 request ID
  bria_v2_request_id?: string; // Database column name
  briaV2RequestId?: string; // Normalized name for frontend use (optional, depends on data fetching)
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
  | 'voiceOverText'
  | 'sceneImageV1' // Type for updating Scene Image V1 URL
  | 'sceneImageV2' // Type for updating Scene Image V2 URL
  | 'bria_v2_request_id'; // Type for updating Bria V2 request ID

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
