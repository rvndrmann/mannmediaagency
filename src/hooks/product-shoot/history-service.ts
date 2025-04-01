
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";

export class ProductShootHistoryService {
  /**
   * Get saved product shots from history
   */
  async getSavedProductShots(): Promise<GeneratedImage[]> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('get_product_shots_history');
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id || uuidv4(),
        prompt: item.scene_description || '',
        status: 'completed',
        createdAt: item.created_at || new Date().toISOString(),
        resultUrl: item.result_url || '',
        url: item.result_url || '',
        inputUrl: item.source_image_url || '',
        source_image_url: item.source_image_url || '',
        settings: item.settings || {}
      }));
    } catch (error) {
      console.error('Error fetching product shot history:', error);
      return [];
    }
  }

  /**
   * Save a product shot to history
   */
  async saveProductShot(image: GeneratedImage): Promise<boolean> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('save_product_shot', {
        source_image_url: image.inputUrl || image.source_image_url || '',
        result_url: image.resultUrl || image.url || '',
        scene_description: image.prompt || '',
        settings_json: image.settings || {}
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving product shot:', error);
      return false;
    }
  }

  /**
   * Get default product images
   */
  async getDefaultProductImages(): Promise<GeneratedImage[]> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('get_default_product_images');
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id || uuidv4(),
        prompt: item.scene_description || '',
        status: 'completed',
        createdAt: item.created_at || new Date().toISOString(),
        resultUrl: item.result_url || item.url || '',
        url: item.result_url || item.url || '',
        inputUrl: item.source_image_url || '',
        source_image_url: item.source_image_url || '',
        settings: item.settings || {}
      }));
    } catch (error) {
      console.error('Error fetching default product images:', error);
      return [];
    }
  }

  /**
   * Set a product image as default
   */
  async setAsDefaultProductImage(image: GeneratedImage): Promise<boolean> {
    try {
      // Use RPC call instead of direct table access
      const { data, error } = await supabase.rpc('set_default_product_image', {
        result_url: image.resultUrl || image.url || '',
        source_image_url: image.inputUrl || image.source_image_url || '',
        settings_json: image.settings || {},
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting default product image:', error);
      return false;
    }
  }
}

// Helper function to generate a UUID
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
