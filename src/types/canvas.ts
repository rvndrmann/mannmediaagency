
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
  order?: number; // Adding this for backward compatibility
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

// Adding SceneUpdateType
export type SceneUpdateType = 'script' | 'description' | 'imagePrompt' | 'image' | 'video' | 'voiceOver';

// Adding WorkflowStage type for our multi-agent workflow
export type WorkflowStage = 
  'script_generation' | 
  'scene_splitting' | 
  'image_generation' | 
  'scene_description' | 
  'video_generation' | 
  'final_assembly';

// Adding WorkflowState interface to track workflow progress
export interface WorkflowState {
  projectId: string;
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  sceneStatuses: Record<string, {
    sceneId: string;
    scriptComplete: boolean;
    imageComplete: boolean;
    descriptionComplete: boolean;
    videoComplete: boolean;
    errors?: string[];
  }>;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
}
