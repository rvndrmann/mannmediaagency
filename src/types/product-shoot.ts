
export interface ProductShootSettings {
  sourceImageUrl: string;
  prompt: string;
  stylePreset?: string;
  version?: string;
  placement?: string;
  background?: string;
}

export interface ProductShotResult {
  id: string;
  resultUrl: string;
  inputUrl: string;
  prompt: string;
  placementType: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    model: string;
    size: string;
    version?: string;
    prompt?: string;
  };
}

export interface GeneratedImage {
  id: string;
  url?: string;
  status: "completed" | "failed" | "processing" | "pending";
  prompt: string;
  createdAt: string;
  resultUrl?: string;
  inputUrl?: string;
  settings?: Record<string, any>;
}

export interface GenerationResult {
  id: string;
  status: "completed" | "failed" | "processing" | "pending";
  result_url?: string;
  images?: ProductShotResult[];
  error?: string;
}

// Additional types needed for product shot forms
export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16";

export interface ProductShotFormData {
  prompt: string;
  sourceImage: File | null;
  sourceImageUrl: string;
  aspectRatio: AspectRatio;
  stylePreset: string;
  background: string;
  placement: string;
}
