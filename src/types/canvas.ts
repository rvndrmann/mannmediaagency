
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
  voiceOverText: string; // Existing column now properly typed
  order: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
}

export type SceneUpdateType = 
  'script' | 
  'imagePrompt' | 
  'description' | 
  'image' | 
  'productImage' | 
  'video' | 
  'voiceOver' | 
  'voiceOverText' | 
  'backgroundMusic';
