
import { GeneratedImage, ProductShotFormData, ProductShotSettings } from './product-shoot';

export interface UseProductShootReturn {
  // Original properties
  formData: ProductShotFormData;
  images: GeneratedImage[];
  isSubmitting: boolean;
  error: string;
  availableCredits: number;
  handleProductShotSubmit: (formData: ProductShotFormData) => Promise<boolean>;
  retryStatusCheck: (imageId: string) => Promise<boolean>;
  clearImages: () => void;
  
  // Additional properties needed by ProductShot components
  settings: ProductShotSettings;
  setSettings: (settings: ProductShotSettings) => void;
  isGenerating: boolean;
  generatedImages: GeneratedImage[];
  savedImages: GeneratedImage[];
  defaultImages: GeneratedImage[];
  uploadImage: (file: File) => Promise<string>;
  saveImage: (image: GeneratedImage) => Promise<boolean>;
  generateProductShot: (formData: ProductShotFormData) => Promise<string>;
  checkImageStatus: (imageId: string) => Promise<boolean>;
  setAsDefault: (imageUrl: string, name?: string) => Promise<boolean>;
  fetchSavedImages: () => Promise<GeneratedImage[]>;
  fetchDefaultImages: () => Promise<GeneratedImage[]>;
}
