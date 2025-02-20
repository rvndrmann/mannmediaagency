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
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  last_checked_at?: string;
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

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
    retry: false,
    staleTime: 30000,
  });

  const { data: userCredits, error: creditsError } = useQuery({
    queryKey: ["userCredits", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["videos", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      console.log("Fetching videos...");
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        throw error;
      }
      
      console.log("Fetched videos:", data);
      return data as SupabaseVideoJob[];
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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
        console.log("New file upload detected, uploading to Supabase storage...");
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('source-images')
          .upload(fileName, selectedFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        console.log("File uploaded successfully:", uploadData);

        const { data: { publicUrl: uploadedUrl } } = supabase.storage
          .from('source-images')
          .getPublicUrl(fileName);

        console.log("Generated public URL:", uploadedUrl);
        publicUrl = uploadedUrl;
      }

      if (!publicUrl) {
        throw new Error("Failed to get public URL for the image");
      }

      console.log("Starting video generation with URL:", publicUrl);
      
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

      if (jobError) {
        throw jobError;
      }

      console.log("Created job record:", jobData);

      const response = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          job_id: jobData.id,
          prompt: prompt.trim(),
          image_url: publicUrl,
          duration: "5",
          aspect_ratio: aspectRatio,
        },
      });

      console.log("Video generation response:", response);

      if (response.error) {
        throw new Error(response.error.message);
      }

      await refetchVideos();
      
      toast.info("Video generation in progress. You can check the status in the gallery.", {
        duration: 5000,
      });

      clearSelectedFile();
      setPrompt("");
    } catch (error) {
      console.error("Error in video generation:", error);
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

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500">Please sign in to access this page</p>
          <Button onClick={() => navigate("/auth/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (creditsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500">Failed to load user data. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobilePanelToggle title="Image to Video" />
      <div className={cn(
        "flex flex-1",
        isMobile ? "flex-col" : "flex-row"
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
