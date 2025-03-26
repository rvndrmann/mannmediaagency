
export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  scenes: CanvasScene[];
}

export interface CanvasScene {
  id: string;
  projectId: string;
  title: string;
  order: number;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  sceneId?: string;
  projectId: string;
  createdAt: string;
}

export type SceneUpdateType = 'script' | 'imagePrompt' | 'image' | 'video';

export interface AgentAction {
  agentType: string;
  action: 'generateScript' | 'generateImagePrompt' | 'generateImage' | 'generateVideo';
  sceneId: string;
  input?: string;
}
