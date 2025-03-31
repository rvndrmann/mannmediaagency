
import { AspectRatio, ProductShotFormData } from '@/types/product-shoot';

export interface ProductShotFormProps {
  formData: ProductShotFormData;
  isLoading: boolean;
  onSubmit: (data: ProductShotFormData) => Promise<void>;
  onCancel: () => void;
}
