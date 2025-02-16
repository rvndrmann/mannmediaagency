
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/image-to-video/InputPanel";
import { GalleryPanel } from "@/components/image-to-video/GalleryPanel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface VideoGenerationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  request_id: string;
  result_url?: string;
  prompt: string;
  progress?: number;
  user_id: string;
  retry_count?: number; // Made optional since it might not exist in all records
}

const ImageToVideo = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
  });

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Ensure each record has retry_count, defaulting to 0 if not present
      return (data || []).map(video => ({
        ...video,
        retry_count: video.retry_count || 0
      })) as VideoGenerationJob[];
    },
    enabled: !!session,
    refetchInterval: (query) => {
      const data = query.state.data as VideoGenerationJob[] | undefined;
      if (!Array.isArray(data)) return false;
      
      return data.some(video => 
        video.status === 'pending' || video.status === 'processing'
      ) ? 3000 : false;
    },
    retry: 3,
  });

  useEffect(() => {
    if (!session?.access_token) return;

    const checkPendingVideos = async () => {
      const { data: pendingVideos, error } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending videos:', error);
        return;
      }

      const checkPromises = (pendingVideos || []).map(async (video) => {
        const elapsedMinutes = (Date.now() - new Date(video.created_at).getTime()) / (60 * 1000);
        
        // Only mark as failed if it's been more than 30 minutes and has been retried 5 times
        if (elapsedMinutes > 30 && (video.retry_count || 0) >= 5) {
          await supabase
            .from('video_generation_jobs')
            .update({ status: 'failed' })
            .eq('id', video.id);
          return;
        }

        try {
          await supabase.functions.invoke('check-video-status', {
            body: { request_id: video.request_id },
          });
        } catch (error) {
          console.error('Error checking video status:', error);
        }
      });

      await Promise.all(checkPromises);
      refetchVideos();
    };

    checkPendingVideos();

    const interval = setInterval(checkPendingVideos, 10000);

    return () => clearInterval(interval);
  }, [session?.access_token, refetchVideos]);

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

  const clearSelectedFile = () => {
    if (previewUrl && !selectedImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setSelectedImageUrl(null);
    setPreviewUrl(null);
  };

  const handleSelectFromHistory = (_jobId: string, imageUrl: string) => {
    clearSelectedFile();
    setSelectedImageUrl(imageUrl);
    setPreviewUrl(imageUrl);
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download video");
    }
  };

  const handleGenerate = async () => {
    if ((!selectedFile && !selectedImageUrl) || !prompt.trim()) {
      toast.error("Please provide both an image and a prompt");
      return;
    }

    if (!session?.access_token) {
      toast.error("Please login to generate videos");
      navigate("/auth/login");
      return;
    }

    try {
      setIsGenerating(true);

      let publicUrl = selectedImageUrl;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('source-images')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl: uploadedUrl } } = supabase.storage
          .from('source-images')
          .getPublicUrl(filePath);

        publicUrl = uploadedUrl;
      }

      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          prompt: prompt.trim(),
          image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatio,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      await refetchVideos();
      
      toast.success("Video generation started!");
      clearSelectedFile();
      setPrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate video";
      const isCreditsError = message.toLowerCase().includes('credits');
      
      toast.error(message, {
        duration: 5000,
        action: isCreditsError ? {
          label: "Buy Credits",
          onClick: () => navigate("/plans")
        } : undefined
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePanelToggle title="Image to Video" />
      <div className={cn(
        "flex-1 flex min-h-0",
        isMobile ? "flex-col" : "flex"
      )}>
        <InputPanel
          isMobile={isMobile}
          prompt={prompt}
          onPromptChange={setPrompt}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onClearFile={clearSelectedFile}
          onSelectFromHistory={handleSelectFromHistory}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          creditsRemaining={userCredits?.credits_remaining}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
        />
        <GalleryPanel
          isMobile={isMobile}
          videos={videos}
          isLoading={videosLoading}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default ImageToVideo;
