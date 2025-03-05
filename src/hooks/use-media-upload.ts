
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomOrderMedia } from "@/types/custom-order";

interface UseMediaUploadResult {
  uploadProgress: Record<string, number>;
  uploading: boolean;
  uploadMedia: (files: File[], orderId: string) => Promise<CustomOrderMedia[]>;
}

export const useMediaUpload = (): UseMediaUploadResult => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);

  const uploadMedia = async (files: File[], orderId: string): Promise<CustomOrderMedia[]> => {
    if (files.length === 0 || !orderId) return [];
    
    setUploading(true);
    const newMediaItems: CustomOrderMedia[] = [];
    
    try {
      // Ensure bucket exists
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === 'custom-order-media');
        
        if (!bucketExists) {
          console.log("Bucket doesn't exist, attempting to create...");
          await supabase.storage.createBucket('custom-order-media', {
            public: true,
          });
        }
      } catch (bucketError) {
        console.warn("Error checking/creating bucket:", bucketError);
      }
      
      // Upload files sequentially
      for (const file of files) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev[file.name] >= 90) {
              clearInterval(progressInterval);
              return { ...prev, [file.name]: 90 };
            }
            return { ...prev, [file.name]: (prev[file.name] || 0) + 10 };
          });
        }, 300);
        
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${orderId}/${crypto.randomUUID()}.${fileExt}`;
          const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('custom-order-media')
            .upload(fileName, file);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('custom-order-media')
            .getPublicUrl(fileName);
          
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          // Add to database using RPC function
          try {
            const { data, error: rpcError } = await supabase.rpc(
              'add_custom_order_media',
              {
                order_id_param: orderId,
                media_url_param: publicUrlData.publicUrl,
                media_type_param: mediaType,
                thumbnail_url_param: mediaType === 'image' ? publicUrlData.publicUrl : null,
                original_filename_param: file.name
              }
            );
            
            if (rpcError) {
              // Fallback to direct insert
              console.warn("RPC function call failed, falling back to direct insert:", rpcError);
              const { data: insertData, error: insertError } = await supabase
                .from('custom_order_media')
                .insert({
                  order_id: orderId,
                  media_url: publicUrlData.publicUrl,
                  media_type: mediaType,
                  thumbnail_url: mediaType === 'image' ? publicUrlData.publicUrl : null,
                  original_filename: file.name
                })
                .select('*')
                .single();
                
              if (insertError) throw insertError;
              
              if (insertData) {
                newMediaItems.push(insertData as unknown as CustomOrderMedia);
              }
            } else if (data) {
              newMediaItems.push(data as CustomOrderMedia);
            }
          } catch (dbError) {
            console.error("Error adding media to database:", dbError);
            toast.error(`Failed to add ${file.name} to database`);
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
          clearInterval(progressInterval);
        }
      }
      
      return newMediaItems;
    } finally {
      setUploading(false);
    }
  };
  
  return {
    uploadProgress,
    uploading,
    uploadMedia
  };
};
