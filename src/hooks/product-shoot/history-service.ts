import { supabase } from '@/integrations/supabase/client';
import { GeneratedImage, ProductHistoryItem } from '@/types/product-shoot';

export class ProductShootHistoryService {
  // Save a product shot to history
  async saveProductShot(image: GeneratedImage): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('product_shot_history')
        .insert({
          user_id: user.id,
          result_url: image.resultUrl || image.url,
          source_image_url: image.inputUrl || image.source_image_url,
          scene_description: image.prompt,
          settings: image.settings ? JSON.stringify(image.settings) : null,
          visibility: 'private'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving product shot:', error);
      return false;
    }
  }
  
  // Get saved product shots from history
  async getSavedProductShots(): Promise<GeneratedImage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('visibility', 'private')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        status: "completed",
        prompt: item.scene_description || '',
        createdAt: item.created_at,
        resultUrl: item.result_url,
        inputUrl: item.source_image_url,
        settings: typeof item.settings === 'string' ? JSON.parse(item.settings) : item.settings,
        visibility: item.visibility,
        url: item.result_url,
        source_image_url: item.source_image_url
      }));
    } catch (error) {
      console.error('Error fetching saved product shots:', error);
      return [];
    }
  }
  
  // Set an image as the default product image
  async setAsDefaultProductImage(image: GeneratedImage): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('default_product_images')
        .insert({
          user_id: user.id,
          url: image.resultUrl || image.url || '',
          source_image_url: image.inputUrl || image.source_image_url || '',
          name: image.prompt || 'Default Product Image',
          context: 'product'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting default product image:', error);
      return false;
    }
  }
  
  // Get default product images
  async getDefaultProductImages(): Promise<GeneratedImage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('default_product_images')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        status: 'completed',
        prompt: item.context || '',
        createdAt: item.created_at,
        resultUrl: item.url,
        inputUrl: item.url,
        isDefault: true,
        url: item.url,
        source_image_url: item.url
      }));
    } catch (error) {
      console.error('Error fetching default product images:', error);
      return [];
    }
  }
}
