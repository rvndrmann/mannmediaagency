
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage } from "@/types/product-shoot";

export const saveToHistory = async (
  image: GeneratedImage,
  sourceImageUrl: string,
  settings: any
): Promise<boolean> => {
  try {
    console.log("Saving image to history:", image.id);
    
    // Call the edge function to save the product shot
    const { data, error } = await supabase.functions.invoke("save-product-shot", {
      body: {
        imageUrl: image.url,
        sourceImageUrl,
        prompt: image.prompt,
        settings
      }
    });

    if (error) {
      console.error("Error saving to history:", error);
      return false;
    }

    console.log("Successfully saved to history:", data);
    return true;
  } catch (err) {
    console.error("Exception in saveToHistory:", err);
    return false;
  }
};

export const getHistory = async (): Promise<GeneratedImage[]> => {
  try {
    const { data, error } = await supabase
      .from("product_shot_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      url: item.result_image_url,
      content_type: "image/jpeg",
      status: "completed",
      prompt: item.prompt
    }));
  } catch (err) {
    console.error("Exception in getHistory:", err);
    return [];
  }
};
