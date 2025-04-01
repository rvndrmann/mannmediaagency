
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
