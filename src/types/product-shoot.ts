
export interface GeneratedImage {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  createdAt: string;
  resultUrl?: string;
  inputUrl?: string;
  settings?: Record<string, any>;
  error?: string;
  userId?: string;
  visibility?: 'public' | 'private';
  isSaved?: boolean;
  isDefault?: boolean;
  // Add compatibility properties
  url?: string;
  source_image_url?: string;
}

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
}

export interface GenerationResponse {
  success: boolean;
  message: string;
  imageId?: string;
  error?: string;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl: string | null;
  error?: string | null;
  settings?: Record<string, any>;
}

export interface ProductHistoryItem {
  id: string;
  inputUrl: string;
  resultUrl: string;
  prompt: string;
  settings: Record<string, any>;
  createdAt: string;
  isDefault?: boolean;
}

// Add the missing types
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ProductShotFormData {
  sourceImage: File | null;
  sourceImageUrl: string;
  prompt: string;
  stylePreset: string;
  aspectRatio: AspectRatio;
  placement: string;
  background: string;
  sourceFile?: File | null;
  referenceFile?: File | null;
  sceneDescription?: string;
  generationType?: 'description' | 'reference';
  placementType?: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  manualPlacement?: string;
  optimizeDescription?: boolean;
  fastMode?: boolean;
  originalQuality?: boolean;
}

export interface ProductShotResult {
  id: string;
  inputUrl: string;
  resultUrl: string;
  placementType: string;
  metadata?: {
    model: string;
    size: string;
    [key: string]: any;
  };
}
