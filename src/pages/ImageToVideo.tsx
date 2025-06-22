import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import { InputPanel } from "@/components/image-to-video/InputPanel";
import { GalleryPanel } from "@/components/image-to-video/GalleryPanel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { useFalImageToVideo } from "@/hooks/useFalImageToVideo"; // Import the new hook

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
  const [aspectRatio, setAspectRatio] = useState<string>("9:16");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePanel, setActivePanel] = useState<'input' | 'gallery'>('input');
  const {
    submitJob: submitFalJob,
    isLoading: isSubmitting, // Renamed to avoid conflict
    isPolling,
    error: falError,
    status: falStatus,
    videoUrl: falVideoUrl,
    requestId: falRequestId,
  } = useFalImageToVideo();

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
      if (!session?.user.id) throw new Error("No user ID");
      
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
    enabled: !!session?.user.id,
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
    console.log("Selected image from history:", imageUrl);
  };

  // Wrap handleGenerate in useCallback
  const handleGenerate = useCallback(async () => {
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

      console.log("Starting Fal AI video generation with URL:", publicUrl);

      // Call the new hook's submit function
      await submitFalJob(prompt.trim(), publicUrl, {
          // Pass optional params - ensure types match hook definition
          duration: 5, // Example: Hardcoding 5s duration, adjust as needed
          aspect_ratio: aspectRatio as "16:9" | "9:16" | "1:1", // Cast aspectRatio
          // negative_prompt: "...", // Add if needed
          // cfg_scale: 0.5, // Add if needed
      });

      // Note: The hook now handles the initial "submission successful" toast.
      // We might want to clear the form immediately after submission is accepted.
      // The hook's internal polling will handle status updates and final result toast.

      // Optional: Clear form after successful submission initiation
      // clearSelectedFile();
      // setPrompt("");

      // We removed the direct DB insert and the old function call.
      // We also removed the refetchVideos() call here, as the hook doesn't update the DB directly.
      // The real-time subscription on the table remains, but won't be triggered by this flow
      // unless we add logic to update the DB when the Fal job completes.

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
      // setIsGenerating(false); // Loading state is now managed by the hook (isSubmitting, isPolling)
    }
  // Add dependencies for useCallback
  }, [selectedFile, selectedImageUrl, prompt, session, navigate, aspectRatio, submitFalJob]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <MobilePanelToggle 
        title="Image to Video" 
        activePanel={activePanel} 
        setActivePanel={setActivePanel}
      />
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
          // Combine submission and polling states for overall "generating" status
          isGenerating={isSubmitting || isPolling}
          creditsRemaining={userCredits?.credits_remaining}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          messages={messages}
          // Pass Fal AI status info down to InputPanel
          falStatus={falStatus}
          falError={falError}
          falVideoUrl={falVideoUrl}
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
