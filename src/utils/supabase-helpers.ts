
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures that a storage bucket exists, creating it if it doesn't
 * @param bucketName Name of the bucket to ensure exists
 * @returns Promise resolving to true if the bucket exists or was created
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      throw listError;
    }
    
    // If bucket doesn't exist, create it
    if (!buckets.find(bucket => bucket.name === bucketName)) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        throw createError;
      }
      
      console.log(`Created bucket: ${bucketName}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to ensure bucket ${bucketName} exists:`, error);
    return false;
  }
}

/**
 * Uploads a file to a Supabase storage bucket
 * @param bucketName Name of the bucket to upload to
 * @param file File to upload
 * @returns Promise resolving to the public URL of the uploaded file, or null if upload failed
 */
export async function uploadFileToBucket(bucketName: string, file: File): Promise<string | null> {
  try {
    // Ensure bucket exists
    const bucketExists = await ensureBucketExists(bucketName);
    
    if (!bucketExists) {
      throw new Error(`Bucket ${bucketName} does not exist and could not be created`);
    }
    
    // Upload the file
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading file to ${bucketName}:`, error);
    return null;
  }
}
