
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
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      if (fileType === 'image') {
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrl(previewUrl);
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadProgress(100);
      setUploadedFileName(file.name);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${fileType}`,
        variant: "destructive",
      });
      setUploadProgress(0);
      setUploadedFileName(null);
      setPreviewUrl(null);
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
