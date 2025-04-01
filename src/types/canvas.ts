
// Add or extend this file with the necessary Canvas project types
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  userId: string;
  user_id?: string;
  fullScript?: string;
  full_script?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  scenes?: CanvasScene[];
}

export interface CanvasScene {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  productImageUrl?: string;
  videoUrl?: string;
  voiceOverUrl?: string;
  voiceOverText?: string;
  backgroundMusicUrl?: string;
  scene_order?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
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
}

export type SceneUpdateType = 
  'script' | 
  'imagePrompt' | 
  'description' | 
  'image' | 
  'productImage' | 
  'video' | 
  'voiceOver' | 
  'backgroundMusic' | 
  'voiceOverText';
