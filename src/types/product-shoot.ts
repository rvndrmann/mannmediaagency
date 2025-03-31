
export interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  metadata?: any;
  content_type?: string;
  result_url?: string;
  source_image_url?: string;
  settings?: any;
}

export interface ProductShotConfig {
  prompt: string;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
}

export interface ProductShotResult {
  id: string;
  url: string;
  resultUrl?: string;
  inputUrl?: string;
  placementType?: string;
  description?: string;
  metadata?: {
    processingTime?: number;
    model?: string;
    size?: string;
    [key: string]: any;
  };
  status: string;
  createdAt: Date;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ProductShotFormData {
  sourceFile: File;
  referenceFile?: File;
  sceneDescription: string;
  generationType: 'description' | 'reference';
  placementType: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  manualPlacement: string;
  optimizeDescription: boolean;
  fastMode: boolean;
  originalQuality: boolean;
  aspectRatio: AspectRatio;
  numResults?: number;
  referenceImageUrl?: string;
  shotWidth?: number;
  shotHeight?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  visibility?: 'private' | 'public';
}

export interface GenerationResult {
  requestId?: string;
  status: 'PENDING' | 'IN_QUEUE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  images?: GeneratedImage[];
  error?: string;
}
