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
  order: number;
  projectId: string;
  createdAt: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  userId: string;
  fullScript: string;
  scenes: CanvasScene[];
  createdAt: string;
}
