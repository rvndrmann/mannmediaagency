
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
// Added field for Fal AI TTS voiceover
voiceover_audio_url?: string | null; // Database column name
voiceoverAudioUrl?: string | null; // Normalized name for frontend use
fal_tts_request_id?: string; // Database column name for TTS request ID
falTtsRequestId?: string; // Normalized name for frontend use
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
  | 'bria_v2_request_id' // Type for updating Bria V2 request ID
  | 'fal_tts_request_id' // Type for updating Fal TTS request ID
  | 'voiceoverAudioUrl'; // Type for updating generated voiceover URL

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

  // Add missing scene image fields
  sceneImageV1Url?: string;
  scene_image_v1_url?: string;
  sceneImageV2Url?: string;
  scene_image_v2_url?: string;
}

// --- Admin Update Types ---

// Represents the structure of a record in the admin_scene_updates table
export interface AdminSceneUpdate {
  id: string; // uuid
  scene_id: string; // uuid, FK to canvas_scenes
  admin_user_id: string; // uuid, FK to auth.users
  update_type: 'script' | 'voiceover' | 'image_prompt' | 'description' | 'image_url' | 'video_url' | 'other'; // TEXT
  update_content?: string | null; // TEXT
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// Represents the payload received from Supabase Realtime for INSERT events
// on the admin_scene_updates table.
export interface AdminSceneUpdatePayload {
  type: 'INSERT'; // We are specifically listening for INSERTs
  table: 'admin_scene_updates';
  schema: 'public';
  record: null; // For INSERT, 'record' is null
  old_record: null; // For INSERT, 'old_record' is null
  new: AdminSceneUpdate; // The newly inserted record
}
