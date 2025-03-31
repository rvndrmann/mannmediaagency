
export interface ProductShotResult {
  resultUrl: string;
  inputUrl: string;
  placementType: 'automatic' | 'centered' | 'floating' | 'angled' | string;
  description?: string;
  metadata?: {
    processingTime: number;
    model: string;
    size: string;
  };
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  status: 'processing' | 'completed' | 'failed';
  content_type: string;
}

export interface GenerationResult {
  images: GeneratedImage[];
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface ProductShotFormData {
  sourceFile?: File;
  referenceFile?: File;
  sceneDescription: string;
  generationType: 'description' | 'reference';
  placementType: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  manualPlacement: string;
  optimizeDescription: boolean;
  fastMode: boolean;
  originalQuality: boolean;
  aspectRatio: AspectRatio;
}
