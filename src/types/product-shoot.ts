
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface ProductShotFormData {
  sourceFile: File | null;
  referenceFile?: File | null;
  sceneDescription?: string;
  generationType: "description" | "reference";
  placementType: "original" | "automatic" | "manual_placement" | "manual_padding";
  manualPlacement?: string;
  optimizeDescription: boolean;
  fastMode: boolean;
  originalQuality: boolean;
  aspectRatio: AspectRatio;
}

export interface ProductShotResult {
  resultUrl: string;
  inputUrl: string;
  placementType: string;
  description?: string;
  metadata?: {
    processingTime?: number;
    model?: string;
    size?: string;
  };
}
