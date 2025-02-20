
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ArrowLeft, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Explore = () => {
  const navigate = useNavigate();
  const [copiedPrompts, setCopiedPrompts] = useState<Record<string, boolean>>({});

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["public-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("status", "completed")
        .eq("visibility", "public");

      if (error) throw error;
      return data;
    },
    enabled: !!session
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .eq("status", "completed")
        .eq("visibility", "public");

      if (error) throw error;
      return data;
    },
    enabled: !!session
  });

  const handleCopyPrompt = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompts(prev => ({ ...prev, [id]: true }));
      toast.success("Prompt copied to clipboard");
      setTimeout(() => {
        setCopiedPrompts(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const isLoading = imagesLoading || videosLoading;
  const hasContent = (images?.length || 0) + (videos?.length || 0) > 0;

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger className="md:hidden" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Explore</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : !hasContent ? (
        <div className="text-center py-12 text-gray-500">
          No public content available yet
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images?.map((image) => (
              <Card key={image.id} className="overflow-hidden bg-gray-900 border-gray-800">
                <div className="aspect-square relative">
                  <img
                    src={image.result_url!}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyPrompt(image.id, image.prompt)}
                      className="text-white hover:text-purple-400"
                    >
                      {copiedPrompts[image.id] ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(image.result_url!, `image-${image.id}.png`)}
                      className="text-white hover:text-purple-400"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 line-clamp-2">{image.prompt}</p>
                </div>
              </Card>
            ))}
            
            {videos?.map((video) => (
              <Card key={video.id} className="overflow-hidden bg-gray-900 border-gray-800">
                <div className="aspect-video relative">
                  <video
                    src={video.result_url!}
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyPrompt(video.id, video.prompt)}
                      className="text-white hover:text-purple-400"
                    >
                      {copiedPrompts[video.id] ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(video.result_url!, `video-${video.id}.mp4`)}
                      className="text-white hover:text-purple-400"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 line-clamp-2">{video.prompt}</p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Explore;
