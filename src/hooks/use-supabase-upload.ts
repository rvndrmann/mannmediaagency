
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseSupabaseUploadResult {
  uploadProgress: number;
  uploadedFileName: string | null;
  previewUrl: string | null;
  handleFileUpload: (file: File, bucket: string, fileType: 'audio' | 'image') => Promise<string | null>;
}

export const useSupabaseUpload = (initialFileName: string | null = null): UseSupabaseUploadResult => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(initialFileName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, bucket: string, fileType: 'audio' | 'image'): Promise<string | null> => {
    if (!file.type.startsWith(`${fileType}/`)) {
      toast({
        title: "Error",
        description: `Please upload a ${fileType} file`,
        variant: "destructive",
      });
      return null;
    }

    setUploadProgress(0);
    setUploadedFileName(null);

    try {
      // Set the preview URL for image files
      if (fileType === 'image') {
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrl(previewUrl);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Create the bucket if it doesn't exist
      try {
        // First check if bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets.some(b => b.name === bucket);
        
        if (!bucketExists) {
          console.log(`Bucket ${bucket} doesn't exist, attempting to create...`);
          // Try to create the bucket
          const { error: createError } = await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
          });
          
          if (createError) {
            console.error("Error creating bucket:", createError);
            throw new Error(`Failed to create storage bucket: ${createError.message}`);
          }
        }
      } catch (bucketError) {
        console.error("Error with bucket operation:", bucketError);
        // Continue with the upload anyway - the bucket might exist but the user doesn't have permission to list buckets
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadedFileName(file.name);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${fileType}: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      setUploadProgress(0);
      setUploadedFileName(null);
      return null;
    }
  };

  return {
    uploadProgress,
    uploadedFileName,
    previewUrl,
    handleFileUpload
  };
};
