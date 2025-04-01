
export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4';

export interface ProductShotFormData {
  prompt: string;
  style: string;
  background: string;
  placement: string;
  aspectRatio: AspectRatio;
  sourceImageUrl?: string;
  sceneDescription?: string;
}

export interface ProductShotResult {
  id: string;
  resultUrl: string;
  prompt: string;
  createdAt: string;
  sourceImageUrl?: string;
  settings?: any;
}

export interface GeneratedImage {
  id: string;
  resultUrl: string;
  url: string; // Alias for resultUrl for compatibility
  prompt: string;
  sourceImageUrl?: string;
  source_image_url?: string; // For API compatibility
  settings?: any;
  createdAt?: string;
  created_at?: string; // For API compatibility
}
