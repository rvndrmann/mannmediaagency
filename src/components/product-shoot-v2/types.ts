
import { ProductShotFormData } from "@/types/product-shoot";

export interface ProductShotFormProps {
  onSubmit: (data: ProductShotFormData) => void;
  isGenerating: boolean;
  isSubmitting?: boolean;
  availableCredits?: number;
}

export interface ImagePreviewProps {
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label?: string;
}

export interface CreditInfoProps {
  numResults: number;
  availableCredits: number;
  isGenerating: boolean;
  isSubmitting: boolean;
}
