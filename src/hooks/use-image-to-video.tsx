
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useImageToVideo = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const handleClearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleGenerate = async (prompt: string, aspectRatio: string) => {
    if (!selectedFile && !previewUrl) {
      toast.error("Please provide an image");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please provide a prompt");
      return;
    }

    try {
      setIsGenerating(true);

      let publicUrl = previewUrl;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('source-images')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: uploadedUrl } } = supabase.storage
          .from('source-images')
          .getPublicUrl(fileName);

        publicUrl = uploadedUrl;
      }

      if (!publicUrl) {
        throw new Error("Failed to get public URL for the image");
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) {
        throw new Error("No user ID found");
      }

      const { data: jobData, error: jobError } = await supabase
        .from('video_generation_jobs')
        .insert({
          prompt: prompt.trim(),
          source_image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatio,
          status: 'in_queue',
          user_id: session.user.id,
          file_name: selectedFile?.name || 'image.jpg',
          content_type: selectedFile?.type || 'image/jpeg',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          job_id: jobData.id,
          prompt: prompt.trim(),
          image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatio,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast.success("Video generation started");
      handleClearFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate video";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    previewUrl,
    handleFileSelect,
    handleClearFile,
    handleGenerate,
  };
};
