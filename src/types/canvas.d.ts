
export interface CanvasScene {
  id: string;
  title: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  voiceOverText?: string;
  duration?: number;
  projectId: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  productImageUrl?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  fullScript?: string;
  scenes?: CanvasScene[];  // Changed from required to optional
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  userId?: string;
  user_id?: string; // Added for API compatibility
  full_script?: string; // Added for API compatibility
}

export interface SceneData {
  title?: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  voiceOverText?: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  productImageUrl?: string;
}
