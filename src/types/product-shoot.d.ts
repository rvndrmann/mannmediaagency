
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
