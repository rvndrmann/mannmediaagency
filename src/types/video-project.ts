export interface VideoProject {
  id: string;
  name: string;
  description?: string;
  status: VideoProjectStatus;
  scenes: VideoScene[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoScene {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  script?: string;
  status: SceneStatus;
  order: number;
  aspectRatio?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export enum VideoProjectStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum SceneStatus {
  PENDING = 'pending',
  GENERATING_IMAGE = 'generating_image',
  GENERATING_VIDEO = 'generating_video',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface VideoProjectToolParams extends Record<string, any> {
  projectId: string;
  sceneId?: string;
}

export interface VideoProjectResponse {
  success: boolean;
  project?: VideoProject;
  error?: string;
}