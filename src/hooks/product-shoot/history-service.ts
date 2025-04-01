
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface GeneratedImage {
  id: string;
  status: "pending" | "completed" | "failed";
  prompt: string;
  createdAt: string;
  resultUrl: string;
  inputUrl: string;
  settings: any;
  visibility: "public" | "private";
  url: string; // Alias for resultUrl
  source_image_url: string; // Alias for inputUrl
}

export class ProductImageHistoryService {
  private static instance: ProductImageHistoryService;

  private constructor() {}

  public static getInstance(): ProductImageHistoryService {
    if (!ProductImageHistoryService.instance) {
      ProductImageHistoryService.instance = new ProductImageHistoryService();
    }
    return ProductImageHistoryService.instance;
  }

  public async saveGeneratedImage(
    sourceImageUrl: string,
    resultUrl: string,
    prompt: string,
    settings?: any
  ): Promise<GeneratedImage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("product_shot_history")
        .insert({
          user_id: user.id,
          source_image_url: sourceImageUrl,
          result_url: resultUrl,
          scene_description: prompt,
          settings: settings || {},
          visibility: "private",
        })
        .select()
        .single();

      if (error) throw error;

      // Convert to GeneratedImage format
      return {
        id: data.id,
        status: "completed",
        prompt: data.scene_description || "",
        createdAt: data.created_at,
        resultUrl: data.result_url,
        inputUrl: data.source_image_url,
        settings: data.settings,
        visibility: "private",
        url: data.result_url, // Alias
        source_image_url: data.source_image_url // Alias
      };
    } catch (error) {
      console.error("Error saving generated image:", error);
      return null;
    }
  }

  public async getRecentImages(limit: number = 10): Promise<GeneratedImage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("product_shot_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Convert from database format to GeneratedImage format
      return (data || []).map((item): GeneratedImage => ({
        id: item.id,
        status: "completed",
        prompt: item.scene_description || "",
        createdAt: item.created_at,
        resultUrl: item.result_url,
        inputUrl: item.source_image_url,
        settings: item.settings,
        visibility: item.visibility as "public" | "private",
        url: item.result_url, // Alias
        source_image_url: item.source_image_url // Alias
      }));
    } catch (error) {
      console.error("Error fetching recent images:", error);
      return [];
    }
  }

  public async getImageById(id: string): Promise<GeneratedImage | null> {
    try {
      const { data, error } = await supabase
        .from("product_shot_history")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        status: "completed",
        prompt: data.scene_description || "",
        createdAt: data.created_at,
        resultUrl: data.result_url,
        inputUrl: data.source_image_url,
        settings: data.settings,
        visibility: data.visibility as "public" | "private",
        url: data.result_url, // Alias
        source_image_url: data.source_image_url // Alias
      };
    } catch (error) {
      console.error("Error fetching image by ID:", error);
      return null;
    }
  }
}

export const productImageHistoryService = ProductImageHistoryService.getInstance();
