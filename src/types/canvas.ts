
export interface CanvasScene {
  id: string;
  title: string;
  script: string;
  imagePrompt: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  productImageUrl: string;
  voiceOverUrl: string;
  backgroundMusicUrl: string;
  voiceOverText: string; // Added field for clean voice-over text without commentary
  order: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
}

export interface CanvasProject {
  id: string;
  title: string;
  userId: string;
  fullScript: string;
  description?: string;
  scenes: CanvasScene[];
  createdAt: string;
  updatedAt: string;
}

export type SceneUpdateType = 
  'script' | 
  'imagePrompt' | 
  'description' | 
  'image' | 
  'productImage' | 
  'video' | 
  'voiceOver' | 
  'voiceOverText' | // Added as a valid update type
  'backgroundMusic';
