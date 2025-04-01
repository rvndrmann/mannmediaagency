
import { supabase } from '@/integrations/supabase/client';
import { GeneratedImage } from '@/types/product-shoot';

export class ProductImageHistoryService {
  private static instance: ProductImageHistoryService;
  private history: GeneratedImage[] = [];
  
  // Make constructor private to enforce singleton pattern
  private constructor() {}
  
  // Provide a static method to get the singleton instance
  public static getInstance(): ProductImageHistoryService {
    if (!ProductImageHistoryService.instance) {
      ProductImageHistoryService.instance = new ProductImageHistoryService();
    }
    return ProductImageHistoryService.instance;
  }
  
  async fetchHistory(): Promise<GeneratedImage[]> {
    try {
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const images: GeneratedImage[] = data.map(item => ({
        id: item.id,
        status: 'completed' as const,
        prompt: item.scene_description || '',
        createdAt: item.created_at,
        resultUrl: item.result_url,
        inputUrl: item.source_image_url,
        settings: {
          aspectRatio: item.settings && typeof item.settings === 'object' 
            ? (item.settings as any).aspect_ratio || '1:1' 
            : '1:1',
          generationType: item.settings && typeof item.settings === 'object' 
            ? (item.settings as any).generation_type || 'description' 
            : 'description',
          placementType: item.settings && typeof item.settings === 'object' 
            ? (item.settings as any).placement_type || 'automatic' 
            : 'automatic'
        },
        visibility: (item.visibility === 'public' || item.visibility === 'private') 
          ? (item.visibility as 'public' | 'private') 
          : 'public',
        url: item.result_url,
        source_image_url: item.source_image_url
      }));
      
      this.history = images;
      return images;
    } catch (error) {
      console.error('Error fetching product shot history:', error);
      return [];
    }
  }
  
  getHistory(): GeneratedImage[] {
    return this.history;
  }
  
  async addToHistory(image: GeneratedImage): Promise<void> {
    try {
      // Add to local state
      this.history = [image, ...this.history];
      
      // We could also add to database here if needed
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }
}

// Export the product history service instance for use in other modules
export const productHistoryService = ProductImageHistoryService.getInstance();
// Alias for backward compatibility
export { ProductImageHistoryService as ProductShootHistoryService };
