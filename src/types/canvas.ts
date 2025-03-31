
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
  userId: string;
  fullScript?: string;
  createdAt?: string;
  updatedAt?: string;
  scenes?: CanvasScene[];
}

export interface CanvasScene {
  id: string;
  projectId: string;
  title?: string;
  description?: string;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  sceneOrder?: number;
  productImageUrl?: string;
  voiceOverText?: string;
  voiceOverUrl?: string;
  backgroundMusicUrl?: string;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SceneMedia {
  id: string;
  sceneId: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  createdAt?: string;
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
