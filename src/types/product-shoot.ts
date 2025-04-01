
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
