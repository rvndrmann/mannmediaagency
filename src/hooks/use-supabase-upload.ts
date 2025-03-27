
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseSupabaseUploadResult {
  uploadProgress: number;
  uploadedFileName: string | null;
  previewUrl: string | null;
  handleFileUpload: (file: File, bucket: string, fileType: 'audio' | 'image' | 'video') => Promise<string | null>;
}

export const useSupabaseUpload = (initialFileName: string | null = null): UseSupabaseUploadResult => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(initialFileName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, bucket: string, fileType: 'audio' | 'image' | 'video'): Promise<string | null> => {
    const fileTypeMap = {
      'audio': 'audio/',
      'image': 'image/',
      'video': 'video/'
    };
    
    if (!file.type.startsWith(fileTypeMap[fileType])) {
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
