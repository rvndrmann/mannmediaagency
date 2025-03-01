
import { Message } from "@/types/message";
import { GeneratedImage } from "@/types/product-shoot";

export interface ProductShotV2Props {
  onSubmit: (formData: any) => void;
  isGenerating: boolean;
  isSubmitting: boolean;
  availableCredits: number;
  generatedImages: GeneratedImage[];
  messages: Message[];
}

export interface ProductShotV1Props {
  isMobile: boolean;
  prompt: string;
  previewUrl: string | null;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
  productImages: any[];
  imagesLoading: boolean;
  creditsRemaining: number;
  isGenerating: boolean;
  onPromptChange: (prompt: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (size: string) => void;
  onInferenceStepsChange: (steps: number) => void;
  onGuidanceScaleChange: (scale: number) => void;
  onOutputFormatChange: (format: string) => void;
  onGenerate: () => void;
  onDownload: (url: string) => void;
}

export interface ImageToVideoProps {
  isMobile: boolean;
  previewUrl: string | null;
  prompt: string;
  aspectRatio: string;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  creditsRemaining: number;
  isGenerating: boolean;
  onGenerate: (prompt: string, aspectRatio: string) => void;
  onSelectFromHistory?: (jobId: string, imageUrl: string) => void;
  onPromptChange?: (prompt: string) => void;
  onAspectRatioChange?: (aspectRatio: string) => void;
}

export interface SplitScreenProps {
  isMobile: boolean;
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: number;
  productShotV2: ProductShotV2Props;
  productShotV1: ProductShotV1Props;
  imageToVideo: ImageToVideoProps;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}
