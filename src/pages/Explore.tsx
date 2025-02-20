
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Download, ArrowLeft, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Explore = () => {
  const navigate = useNavigate();
  const [copiedPrompts, setCopiedPrompts] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "images" | "videos">("all");

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

  const ImageGrid = ({ items = [] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((image) => (
        <Card key={image.id} className="overflow-hidden bg-gray-900 border-gray-800">
          <div className="relative">
            <img
              src={image.result_url!}
              alt={image.prompt}
              className="w-full h-auto"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
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
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1">{image.prompt}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopyPrompt(image.id, image.prompt)}
                className="shrink-0"
              >
                {copiedPrompts[image.id] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const VideoGrid = ({ items = [] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((video) => (
        <Card key={video.id} className="overflow-hidden bg-gray-900 border-gray-800">
          <div className="relative">
            <video
              src={video.result_url!}
              className="w-full h-auto"
              controls
              preload="metadata"
              controlsList="nodownload"
              playsInline
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
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
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1">{video.prompt}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopyPrompt(video.id, video.prompt)}
                className="shrink-0"
              >
                {copiedPrompts[video.id] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

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
        <Tabs value={activeTab} onValueChange={(value: "all" | "images" | "videos") => setActiveTab(value)}>
          <TabsList>
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
            <TabsContent value="all" className="m-0">
              <div className="space-y-8">
                {images?.length ? <ImageGrid items={images} /> : null}
                {videos?.length ? (
                  <div className="mt-8">
                    <VideoGrid items={videos} />
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="images" className="m-0">
              {images?.length ? (
                <ImageGrid items={images} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No public images available
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="m-0">
              {videos?.length ? (
                <VideoGrid items={videos} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No public videos available
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </div>
  );
};

export default Explore;
