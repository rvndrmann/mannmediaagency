
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";
import { PostgrestSingleResponse } from "@supabase/supabase-js";

/**
 * Service to handle product shot history
 */
export class ProductShotHistoryService {
  /**
   * Fetch product shot history for a user
   */
  static async fetchHistory(limit: number = 20): Promise<GeneratedImage[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching product shot history:", error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        prompt: item.scene_description || "",
        status: "completed",
        createdAt: typeof item.created_at === 'string' ? item.created_at : item.created_at.toISOString(),
        resultUrl: item.result_url,
        inputUrl: item.source_image_url,
        url: item.result_url,
        source_image_url: item.source_image_url,
        content_type: item.content_type || "image/jpeg",
        settings: item.settings
      }));
    } catch (error) {
      console.error("Error in ProductShotHistoryService.fetchHistory:", error);
      return [];
    }
  }
  
  /**
   * Save a generated image to history
   */
  static async saveToHistory(imageData: Partial<GeneratedImage>): Promise<{ success: boolean, id?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from('product_shot_history')
        .insert([
          {
            user_id: userData.user.id,
            scene_description: imageData.prompt,
            result_url: imageData.resultUrl,
            source_image_url: imageData.inputUrl || imageData.source_image_url,
            settings: imageData.settings || {},
            visibility: 'private'
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error("Error saving to product shot history:", error);
        throw error;
      }
      
      return {
        success: true,
        id: data.id
      };
    } catch (error) {
      console.error("Error in ProductShotHistoryService.saveToHistory:", error);
      return { success: false };
    }
  }
}
