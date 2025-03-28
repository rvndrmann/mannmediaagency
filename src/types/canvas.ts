
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  fullScript?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  scenes: CanvasScene[];
}

export interface CanvasScene {
  id: string;
  projectId: string;
  title: string;
  order: number; // We'll map this to scene_order in the database
  script?: string;
  description?: string;
  imagePrompt?: string;
  imageUrl?: string;
  productImageUrl?: string;
  videoUrl?: string;
  voiceOverUrl?: string; // Field for voice-over audio
  backgroundMusicUrl?: string; // Field for background music
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  sceneId?: string;
  projectId: string;
  createdAt: string;
}

export type SceneUpdateType = 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic';

export interface AgentAction {
  agentType: string;
  action: 'generateScript' | 'generateImagePrompt' | 'generateImage' | 'generateVideo';
  sceneId: string;
  input?: string;
}
