
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";
import { useQueryClient } from "@tanstack/react-query";

export async function saveToHistory(
  image: GeneratedImage, 
  sourceUrl: string,
  settings: any
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('No session found when trying to save to history');
    return;
  }

  try {
    const historyEntry = {
      user_id: session.user.id,
      result_url: image.url,
      source_image_url: sourceUrl,
      scene_description: image.prompt || null,
      settings: settings || {}
    };

    console.log('Saving history entry:', historyEntry);

    const { error: dbError } = await supabase
      .from('product_shot_history')
      .insert(historyEntry);

    if (dbError) {
      console.error('Error saving to history:', dbError);
      throw dbError;
    }

    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ["product-shot-history"] });
  } catch (error) {
    console.error('Error saving to history:', error);
    throw error;
  }
}
