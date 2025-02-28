
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useImageToVideo = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setSelectedImageUrl(null);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const handleClearFile = () => {
    if (previewUrl && !selectedImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setSelectedImageUrl(null);
    setPreviewUrl(null);
  };

  const handleSelectFromHistory = (jobId: string, imageUrl: string) => {
    if (previewUrl && !selectedImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setSelectedImageUrl(imageUrl);
    setPreviewUrl(imageUrl);
    console.log("Selected image from history:", imageUrl);
  };

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
  };

  const handleAspectRatioChange = (newAspectRatio: string) => {
    setAspectRatio(newAspectRatio);
  };

  const handleGenerate = async (promptText: string, aspectRatioValue: string) => {
    if (!selectedFile && !previewUrl) {
      toast.error("Please provide an image");
      return;
    }

    if (!promptText.trim()) {
      toast.error("Please provide a prompt");
      return;
    }

    try {
      setIsGenerating(true);

      let publicUrl = selectedImageUrl;

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
          prompt: promptText.trim(),
          source_image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatioValue,
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
          prompt: promptText.trim(),
          image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatioValue,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast.success("Video generation started");
      handleClearFile();
      setPrompt("");
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
    prompt,
    aspectRatio,
    handleFileSelect,
    handleClearFile,
    handleSelectFromHistory,
    handlePromptChange,
    handleAspectRatioChange,
    handleGenerate,
  };
};
