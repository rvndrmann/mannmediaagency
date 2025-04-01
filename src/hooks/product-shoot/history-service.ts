
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";
import { Json } from "@/integrations/supabase/types";

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

// Fetch product image history
export async function fetchHistory(): Promise<GeneratedImage[]> {
  try {
    // Use a direct query approach to avoid type issues with supabase client
    const { data, error } = await supabase
      .from('product_shots')
      .select('*')
      .eq('visibility', 'saved')
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from('default_product_images')
      .select('*')
      .order('last_used_at', { ascending: false });

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
    // Direct query to update visibility
    const result = await supabase
      .from('product_shots')
      .update({ visibility: 'saved' })
      .eq('id', imageId);

    if (result.error) {
      throw result.error;
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
    // Get the image data
    const result = await supabase
      .from('product_shots')
      .select('*')
      .eq('id', imageId)
      .single();

    if (result.error || !result.data) {
      throw result.error || new Error('Image not found');
    }

    const imageData = result.data;

    // Create a default image entry
    const insertResult = await supabase
      .from('default_product_images')
      .insert({
        url: imageData.result_url,
        name: imageData.scene_description || 'Default Product Image',
        context: 'product_shot',
        user_id: imageData.user_id
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
