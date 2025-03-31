
import { GeneratedImage, ProductShotFormData } from "@/types/product-shoot";

export interface ProductShotFormProps {
  onSubmit: (formData: any) => Promise<void>;
  isSubmitting: boolean;
  availableCredits: number;
  generatedImages?: GeneratedImage[];
  isGenerating?: boolean;
  onRetryImageCheck?: (imageId: string) => Promise<void>;
  messages?: any[];
  formData?: ProductShotFormData;
  isLoading?: boolean;
  onCancel?: () => void;
}
