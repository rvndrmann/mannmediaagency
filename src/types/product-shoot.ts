
export interface GeneratedImage {
  url: string;
  content_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  id: string;
}

export interface GenerationResult {
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  images?: GeneratedImage[];
  error?: string;
}

export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface ProductShotFormData {
  sourceFile: File | null;
  referenceFile: File | null;
  sceneDescription: string;
  generationType: 'description' | 'reference';
  placementType: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  manualPlacement: string;
  optimizeDescription: boolean;
  numResults: number;
  fastMode: boolean;
  originalQuality: boolean;
  shotWidth: number;
  shotHeight: number;
  syncMode: boolean;
  aspectRatio: AspectRatio;
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}
