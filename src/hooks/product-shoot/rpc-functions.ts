
import { supabase } from "@/integrations/supabase/client";

// Interface for using RPCs instead of direct table access
export interface ProductShotRPC {
  insert_product_shot: (params: {
    p_source_image_url: string;
    p_scene_description: string;
    p_ref_image_url: string;
    p_settings: Record<string, any>;
    p_status: string;
    p_user_id: string;
    p_visibility: string;
  }) => Promise<string>;
  
  get_product_shot_status: (params: {
    p_id: string;
  }) => Promise<{
    id: string;
    status: string;
    result_url: string | null;
    error_message: string | null;
    settings: Record<string, any>;
  }>;
}

// Helper function to check if a table exists in the database
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('table_exists', { table_name: tableName });
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}
