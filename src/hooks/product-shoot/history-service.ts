
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";
import { Json } from "@/integrations/supabase/types";
import { ProductShotRPC } from "./rpc-functions";

// Use a utility function for safer type casting from database results
function mapDbResultToGeneratedImage(item: any): GeneratedImage {
  return {
    id: item.id || '',
    prompt: item.scene_description || '',
    status: 'completed',
    createdAt: item.created_at || new Date().toISOString(),
    resultUrl: item.result_url || '',
    inputUrl: item.ref_image_url || '',
    url: item.source_image_url || '',
    source_image_url: item.source_image_url || '',
    settings: (typeof item.settings === 'string') 
      ? JSON.parse(item.settings) 
      : (item.settings as Record<string, any>) || {}
  };
}

// Fetch product image history using RPC function
export async function fetchHistory(): Promise<GeneratedImage[]> {
  try {
    // Call the get_product_shot_history RPC function
    const { data, error } = await supabase
      .rpc('get_product_shot_history', {
        p_visibility: 'saved'
      });

    if (error) {
      throw error;
    }

    // Convert DB response to GeneratedImage array
    return (data || []).map(mapDbResultToGeneratedImage);
  } catch (error) {
    console.error('Error fetching product image history:', error);
    return [];
  }
}

// Fetch default product images
export async function fetchDefaultImages(): Promise<GeneratedImage[]> {
  try {
    // Use RPC instead of direct table access
    const { data, error } = await supabase
      .rpc('get_default_product_images');

    if (error) {
      throw error;
    }

    // Convert DB response to GeneratedImage array
    return (data || []).map(item => ({
      id: item.id,
      prompt: item.name || '',
      status: 'completed',
      createdAt: new Date().toISOString(),
      url: item.url,
      resultUrl: item.url
    }));
  } catch (error) {
    console.error('Error fetching default product images:', error);
    return [];
  }
}

// Save an image to history
export async function saveImage(imageId: string): Promise<boolean> {
  try {
    // Use RPC to update visibility
    const { data, error } = await supabase
      .rpc('update_product_shot_visibility', {
        p_id: imageId, 
        p_visibility: 'saved'
      });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error saving product image:', error);
    return false;
  }
}

// Set an image as default
export async function setAsDefault(imageId: string): Promise<boolean> {
  try {
    // Get the image data using RPC
    const { data, error } = await supabase
      .rpc('get_product_shot_by_id', { p_id: imageId });

    if (error || !data) {
      throw error || new Error('Image not found');
    }

    // Create a default image entry using RPC
    const insertResult = await supabase
      .rpc('create_default_product_image', {
        p_url: data.result_url,
        p_name: data.scene_description || 'Default Product Image',
        p_context: 'product_shot',
        p_user_id: data.user_id
      });

    if (insertResult.error) {
      throw insertResult.error;
    }

    return true;
  } catch (error) {
    console.error('Error setting image as default:', error);
    return false;
  }
}
