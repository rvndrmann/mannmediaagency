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

interface SupabaseVideoJob {
  id: string;
  status: 'in_queue' | 'processing' | 'completed' | 'failed';
  created_at: string;
  request_id: string;
  result_url?: string;
  prompt: string;
  progress?: number;
  user_id: string;
  aspect_ratio: string;
  content_type: string;
  duration: string;
  file_name: string;
  file_size: number;
  negative_prompt: string;
  source_image_url: string;
  retry_count?: number;
  error_message?: string;
}

interface VideoGenerationJob {
  id: string;
  status: 'in_queue' | 'processing' | 'completed' | 'failed';
  created_at: string;
  request_id: string;
  result_url?: string;
  prompt: string;
  progress?: number;
  user_id: string;
  retry_count?: number;
  error_message?: string;
}

const getPollingInterval = (elapsedMinutes: number): number => {
  if (elapsedMinutes < 2) return 30000; // 30 seconds for first 2 minutes
  if (elapsedMinutes < 5) return 45000; // 45 seconds for 2-5 minutes
  return 60000; // 60 seconds for 5-7 minutes
};

const ImageToVideo = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const MAX_POLLING_TIME = 7 * 60 * 1000; // 7 minutes in milliseconds

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
      console.log("Fetching videos...");
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        throw error;
      }
      
      console.log("Fetched videos:", data);
      return data as VideoGenerationJob[];
    },
    enabled: !!session,
  });

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generation_jobs'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          refetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchVideos]);

  useEffect(() => {
    const pendingVideos = videos.filter(
      video => video.status === 'in_queue'
    );

    if (pendingVideos.length === 0) return;

    const pollVideo = async (video: VideoGenerationJob) => {
      if (!video.request_id) return;

      const startTime = video.created_at ? new Date(video.created_at).getTime() : Date.now();
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const elapsedMinutes = elapsedTime / (60 * 1000);

      if (elapsedTime > MAX_POLLING_TIME) {
        console.log(`Stopping poll for video ${video.id} - exceeded 7 minutes`);
        
        await supabase
          .from('video_generation_jobs')
          .update({
            error_message: 'Generation timed out after 7 minutes',
            updated_at: new Date().toISOString()
          })
          .eq('id', video.id);
          
        return;
      }

      try {
        const response = await supabase.functions.invoke('check-video-status', {
          body: { request_id: video.request_id }
        });

        if (response.error) {
          console.error(`Error polling video ${video.id}:`, response.error);
          return;
        }

        console.log(`Poll response for video ${video.id}:`, response.data);
        
        if (response.data?.status === 'completed') {
          toast.success("Your video is ready!");
        } else if (response.data?.error_message) {
          toast.error(response.data.error_message || "Failed to generate video");
        }
      } catch (error) {
        console.error(`Failed to poll video ${video.id}:`, error);
      }
    };

    const pollResults = async () => {
      for (const video of pendingVideos) {
        await pollVideo(video);
      }
    };

    pollResults();

    const intervalId = setInterval(() => {
      const oldestPendingVideo = pendingVideos[0];
      if (!oldestPendingVideo) return;

      const startTime = oldestPendingVideo.created_at ? new Date(oldestPendingVideo.created_at).getTime() : Date.now();
      const elapsedMinutes = (Date.now() - startTime) / (60 * 1000);
      const interval = getPollingInterval(elapsedMinutes);

      pollResults();
    }, getPollingInterval(0));

    return () => clearInterval(intervalId);
  }, [videos]);

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
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      await refetchVideos();
      
      toast.success("Video generation started! This typically takes about 7 minutes.");
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
          onDownload={async (url: string) => {
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
          }}
        />
      </div>
    </div>
  );
};

export default ImageToVideo;
