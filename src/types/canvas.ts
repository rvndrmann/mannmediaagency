
export interface ProjectAsset {
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  description: string | null;
  final_video_url: string | null;
  full_script: string | null;
  main_product_image_url: string | null;
  project_assets: ProjectAsset[] | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  cover_image_url?: string | null;
  scenes?: CanvasScene[];
  // Compatibility aliases
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  fullScript?: string;
}

export interface CanvasScene {
  background_music_url: string | null;
  bria_v2_request_id: string | null;
  created_at: string;
  custom_instruction: string | null;
  description: string | null;
  duration: number | null;
  fal_tts_request_id: string | null;
  id: string;
  image_prompt: string | null;
  image_url: string | null;
  is_template: boolean | null;
  product_image_url: string | null;
  project_id: string;
  scene_order: number | null;
  script: string | null;
  template_id: string | null;
  updated_at: string;
  video_url: string | null;
  voice_over_text: string | null;
  voice_over_url: string | null;
  scene_image_v1_url?: string | null;
  scene_image_v2_url?: string | null;
  // Compatibility aliases for both naming conventions
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceOverText?: string;
  voiceOverUrl?: string;
  sceneOrder?: number;
  imagePrompt?: string;
  productImageUrl?: string;
  backgroundMusicUrl?: string;
  sceneImageV1Url?: string;
  sceneImageV2Url?: string;
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
  | 'sceneImageV1'
  | 'sceneImageV2'
  | 'bria_v2_request_id'
  | 'fal_tts_request_id'
  | 'voiceoverAudioUrl';

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
  sceneImageV1Url?: string;
  scene_image_v1_url?: string;
  sceneImageV2Url?: string;
  scene_image_v2_url?: string;
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

export interface AdminSceneUpdate {
  id: string;
  scene_id: string;
  admin_user_id: string;
  update_type: 'script' | 'voiceover' | 'image_prompt' | 'description' | 'image_url' | 'video_url' | 'other';
  update_content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSceneUpdatePayload {
  type: 'INSERT';
  table: 'admin_scene_updates';
  schema: 'public';
  record: null;
  old_record: null;
  new: AdminSceneUpdate;
}

export type UpdateSceneFunction = (
  sceneId: string,
  type: SceneUpdateType,
  value: string
) => Promise<void>;
