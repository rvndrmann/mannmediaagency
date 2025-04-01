
export interface ProductShootSettings {
  sourceImageUrl: string;
  prompt: string;
  stylePreset: string;
  version: string;
  placement: string;
  background: string;
  outputFormat: string;
  imageWidth: number;
  imageHeight: number;
  quality: string;
  seed?: string;
  scale?: number;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  resultUrl?: string;
  url?: string;
  inputUrl?: string;
  source_image_url?: string;
  content_type?: string;
  settings?: Record<string, any>;
}

export interface GenerationResponse {
  success: boolean;
  message: string;
  imageId?: string;
  resultUrl?: string;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl: string | null;
  error: string | null;
  settings?: Record<string, any>;
}

// Additional types needed for product-shoot-v2 components
export type AspectRatio = '1:1' | '16:9' | '9:16';

export interface ProductShotFormData {
  prompt: string;
  sourceImage: File | null;
  sourceImageUrl: string;
  stylePreset: string;
  background: string;
  placement: string;
  aspectRatio: AspectRatio;
  // Additional fields for extended functionality
  sourceFile: File | null;
  referenceFile: File | null;
  sceneDescription: string;
  generationType: 'description' | 'reference';
  placementType: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  manualPlacement: string;
  optimizeDescription: boolean;
  fastMode: boolean;
  originalQuality: boolean;
}

export interface ProductShotResult {
  resultUrl: string;
  inputUrl: string;
  placementType: string;
  metadata?: {
    model: string;
    size: string;
  };
}
