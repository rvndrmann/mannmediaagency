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

const ImageToVideo = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("5");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");

  // Check authentication status
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

  // Fetch user credits
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

  // Fetch videos
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!session?.access_token) return;

    // Function to check status of pending/processing videos
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

      // For each pending video, check its status
      for (const video of pendingVideos) {
        const elapsedMinutes = (Date.now() - new Date(video.created_at).getTime()) / (60 * 1000);
        
        // If more than 10 minutes have passed, mark as failed
        if (elapsedMinutes > 10) {
          await supabase
            .from('video_generation_jobs')
            .update({ status: 'failed' })
            .eq('id', video.id);
          continue;
        }

        try {
          // Check status with appropriate interval
          const intervalMinutes = elapsedMinutes < 2 ? 0.5 : 1; // 30s for first 2 min, then 1 min
          
          const response = await supabase.functions.invoke('check-video-status', {
            body: { request_id: video.request_id },
          });

          if (response.error) {
            console.error('Error checking video status:', response.error);
            continue;
          }

          // Wait before checking the next video
          await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
        } catch (error) {
          console.error('Error checking video status:', error);
        }
      }
    };

    // Initial check
    checkPendingVideos();

    // Set up interval for periodic checks
    const interval = setInterval(checkPendingVideos, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session?.access_token]);

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
        
        console.log('Uploading file:', filePath);
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('source-images')
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('Upload successful:', uploadData);

        const { data: { publicUrl: uploadedUrl } } = supabase.storage
          .from('source-images')
          .getPublicUrl(filePath);

        publicUrl = uploadedUrl;
      }

      console.log('Using image URL:', publicUrl);

      // Generate video with auth token
      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          prompt: prompt.trim(),
          image_url: publicUrl,
          duration,
          aspect_ratio: aspectRatio,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

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
          duration={duration}
          onDurationChange={setDuration}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
        />
        <GalleryPanel
          isMobile={isMobile}
          videos={videos || []}
          isLoading={videosLoading}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default ImageToVideo;
