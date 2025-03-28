
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function uploadFileToBucket(bucket: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    // Upload the file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading file to ${bucket}:`, error);
    throw error;
  }
}

export async function deleteFileFromBucket(bucket: string, path: string): Promise<void> {
  try {
    // Extract the file name from the public URL
    const fileName = path.split('/').pop();
    
    if (!fileName) {
      throw new Error("Invalid file path");
    }
    
    // Delete the file from Supabase storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting file from ${bucket}:`, error);
    throw error;
  }
}
