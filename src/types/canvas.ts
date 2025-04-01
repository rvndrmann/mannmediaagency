export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  fullScript?: string;
  scenes?: CanvasScene[];
  productImage?: string;
}

export interface CanvasScene {
  id: string;
  title: string;
  script?: string;
  imagePrompt?: string;
  description?: string;
  image?: string;
  video?: string;
  voiceOver?: string;
  voiceOverText?: string;
  backgroundMusic?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  scene_order?: number;
  productImage?: string;
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
  updatedAt: string;
  completedStages?: WorkflowStage[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  sceneStatuses?: Record<string, any>;
  progress?: number;
}

export interface SceneUpdateType {
  type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'voiceOverText';
  value: string;
}
