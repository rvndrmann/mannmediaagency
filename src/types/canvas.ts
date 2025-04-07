// src/types/canvas.ts (Corrected Content)

export interface CanvasProject {
  id: string;
  title: string;
  description: string | null;
  final_video_url: string | null;
  full_script: string | null;
  main_product_image_url: string | null;
  user_id: string; // Matches DB schema
  created_at: string; // Matches DB schema
  updated_at: string; // Matches DB schema
  // Add normalized fields if needed elsewhere, but keep base type aligned with DB
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasScene {
  background_music_url: string | null;
  bria_v2_request_id: string | null;
  created_at: string; // Matches DB schema
  custom_instruction: string | null;
  description: string | null;
  duration: number | null;
  fal_tts_request_id: string | null;
  id: string;
  image_prompt: string | null;
  image_url: string | null;
  is_template: boolean | null;
  product_image_url: string | null;
  project_id: string; // Matches DB schema
  scene_order: number | null;
  script: string | null;
  template_id: string | null;
  updated_at: string; // Matches DB schema
  video_url: string | null;
  voice_over_text: string | null;
  voice_over_url: string | null;
  // Add normalized fields if needed elsewhere, but keep base type aligned with DB
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string; // Keep title if used in UI, though not in DB schema directly
  imageUrl?: string; // Keep normalized fields if used extensively
  videoUrl?: string;
  voiceOverText?: string; // Already exists in DB schema as voice_over_text
  voiceOverUrl?: string; // Already exists in DB schema as voice_over_url
  sceneOrder?: number; // Keep normalized field if used
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
