
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";

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
  onPromptChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (value: string) => void;
  onInferenceStepsChange: (value: number) => void;
  onGuidanceScaleChange: (value: number) => void;
  onOutputFormatChange: (value: string) => void;
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
  onSelectFromHistory: (jobId: string, imageUrl: string) => void;
}

export interface ProductShotV2Props {
  onSubmit: (formData: any) => Promise<void>;
  isGenerating: boolean;
  isSubmitting: boolean;
  availableCredits: number;
  generatedImages: GeneratedImage[];
  messages: Message[];
}

export interface SplitScreenProps {
  isMobile: boolean;
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  productShotV2: ProductShotV2Props;
  productShotV1: ProductShotV1Props;
  imageToVideo: ImageToVideoProps;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}
