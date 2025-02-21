
export interface GeneratedImage {
  url: string;
  content_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  id: string;
}

export interface GenerationResult {
  status: 'processing' | 'completed' | 'failed';
  images?: GeneratedImage[];
  error?: string;
}

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
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}
