
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
  scenes?: CanvasScene[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  userId?: string;
}
