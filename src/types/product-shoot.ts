
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
