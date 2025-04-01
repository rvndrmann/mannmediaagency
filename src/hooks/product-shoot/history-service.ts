
import { supabase } from '@/integrations/supabase/client';
import { GeneratedImage } from '@/types/product-shoot';

class ProductShotHistoryService {
  // Fetch history from the database
  async fetchHistory(): Promise<GeneratedImage[]> {
    try {
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Convert to GeneratedImage type
      return (data || []).map(item => ({
        id: item.id,
        prompt: item.prompt,
        status: 'completed', // All items from this query are completed
        createdAt: item.created_at,
        resultUrl: item.result_url,
        inputUrl: item.source_image_url,
        url: item.result_url,
        source_image_url: item.source_image_url,
        content_type: 'image/jpeg', // Default content type
        settings: item.settings || {}
      }));
    } catch (error) {
      console.error('Error fetching product shot history:', error);
      return [];
    }
  }

  // Save an image to history
  async saveImage(imageId: string): Promise<boolean> {
    try {
      // Update visibility to make it public
      const { error } = await supabase
        .from('product_shot_history')
        .update({ visibility: 'public' })
        .eq('id', imageId);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving image to history:', error);
      return false;
    }
  }

  // Set an image as default
  async setAsDefault(imageId: string): Promise<boolean> {
    try {
      // Get the image data
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('id', imageId)
        .single();
        
      if (error || !data) {
        throw error || new Error('Image not found');
      }
      
      // Insert into default_product_images
      const { error: insertError } = await supabase
        .from('default_product_images')
        .insert({
          url: data.result_url,
          name: `Product ${new Date().toLocaleDateString()}`,
          context: 'product'
        });
        
      if (insertError) {
        throw insertError;
      }
      
      return true;
    } catch (error) {
      console.error('Error setting image as default:', error);
      return false;
    }
  }

  // Fetch default images
  async fetchDefaultImages(): Promise<GeneratedImage[]> {
    try {
      const { data, error } = await supabase
        .from('default_product_images')
        .select('*')
        .eq('context', 'product')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Convert to GeneratedImage type
      return (data || []).map(item => ({
        id: item.id,
        prompt: 'Default Product Image',
        status: 'completed',
        createdAt: item.created_at,
        url: item.url,
        resultUrl: item.url,
        settings: {}
      }));
    } catch (error) {
      console.error('Error fetching default product images:', error);
      return [];
    }
  }
}

export const historyService = new ProductShotHistoryService();
