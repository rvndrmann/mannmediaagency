
export interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  metadata?: any;
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
  status: string;
  createdAt: Date;
}
