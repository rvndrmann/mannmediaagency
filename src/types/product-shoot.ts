
import { ReactNode } from "react";

export type AspectRatio = "1:1" | "16:9" | "9:16";

export interface ProductShotFormData {
  sourceFile: File;
  referenceFile?: File;
  sceneDescription: string;
  generationType: "description" | "reference";
  placementType: "original" | "automatic" | "manual_placement" | "manual_padding";
  manualPlacement: string;
  optimizeDescription: boolean;
  fastMode: boolean;
  originalQuality: boolean;
  aspectRatio: AspectRatio;
}

export interface ProductShotFormProps {
  onSubmit: (formData: ProductShotFormData) => Promise<void>;
  isSubmitting: boolean;
  availableCredits?: number;
  isLoading?: boolean;
  formData?: ProductShotFormData;
  onCancel?: () => void;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  status?: "pending" | "processing" | "completed" | "failed";
  contentType?: string;
}

export interface ProductShootSettings {
  prompt: string;
  outputFormat: string;
  imageWidth: number;
  imageHeight: number;
  quality: number;
  seed?: number;
  scale?: number;
}

export interface GeneratedImagesProps {
  images: GeneratedImage[];
  isLoading: boolean;
  onSave?: (id: string) => void;
  onSetAsDefault?: (id: string) => void;
  title?: string;
  emptyMessage?: string | ReactNode;
}

export interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export interface ProductShotResult {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface InputPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  outputFormat: string;
  onOutputFormatChange: (format: string) => void;
  imageWidth: number;
  imageHeight: number;
  onDimensionsChange: (width: number, height: number) => void;
  quality: number;
  onQualityChange: (quality: number) => void;
  seed?: number;
  onSeedChange: (seed?: number) => void;
  scale?: number;
  onScaleChange: (scale?: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export interface GalleryPanelProps {
  generatedImages: GeneratedImage[];
  savedImages: GeneratedImage[];
  defaultImages: GeneratedImage[];
  onSaveImage: (imageId: string) => void;
  onSetAsDefault: (imageId: string) => void;
}
