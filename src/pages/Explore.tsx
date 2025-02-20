
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff, Download, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Explore = () => {
  const [showPublicOnly, setShowPublicOnly] = useState(true);
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["public-images", showPublicOnly],
    queryFn: async () => {
      const query = supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("status", "completed");

      if (showPublicOnly) {
        query.eq("visibility", "public");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!session
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["public-videos", showPublicOnly],
    queryFn: async () => {
      const query = supabase
        .from("video_generation_jobs")
        .select("*")
        .eq("status", "completed");

      if (showPublicOnly) {
        query.eq("visibility", "public");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!session
  });

  const toggleVisibility = async (type: 'image' | 'video', id: string, currentVisibility: string) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    const table = type === 'image' ? 'image_generation_jobs' : 'video_generation_jobs';
    
    const { error } = await supabase
      .from(table)
      .update({ visibility: newVisibility })
      .eq('id', id);

    if (error) {
      toast.error(`Failed to update visibility: ${error.message}`);
    } else {
      toast.success(`Content is now ${newVisibility}`);
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show Public Only</span>
          <Switch
            checked={showPublicOnly}
            onCheckedChange={setShowPublicOnly}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : !hasContent ? (
        <div className="text-center py-12 text-gray-500">
          {showPublicOnly 
            ? "No public content available yet"
            : "No content available yet"}
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
                    {session?.user.id === image.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleVisibility('image', image.id, image.visibility)}
                        className="text-white hover:text-purple-400"
                      >
                        {image.visibility === 'public' ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </Button>
                    )}
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
                    {session?.user.id === video.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleVisibility('video', video.id, video.visibility)}
                        className="text-white hover:text-purple-400"
                      >
                        {video.visibility === 'public' ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </Button>
                    )}
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
