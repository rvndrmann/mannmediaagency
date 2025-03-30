
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
}

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  full_script?: string;
}

export interface CanvasScene {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  script?: string;
  image_prompt?: string;
  image_url?: string;
  video_url?: string;
  scene_order?: number;
  created_at?: string;
  updated_at?: string;
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
