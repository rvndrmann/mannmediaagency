import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Download, ArrowLeft, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [copiedPrompts, setCopiedPrompts] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "images" | "videos">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const { ref: loadMoreRef, inView } = useInView();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: images = [], isLoading: imagesLoading, fetchNextPage: fetchMoreImages, hasNextPage: hasMoreImages } = useQuery({
    queryKey: ["public-images", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          id,
          prompt,
          result_url,
          settings->guidanceScale,
          settings->numInferenceSteps
        `)
        .eq("status", "completed")
        .eq("visibility", "public")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
    keepPreviousData: true
  });

  const { data: videos = [], isLoading: videosLoading, fetchNextPage: fetchMoreVideos, hasNextPage: hasMoreVideos } = useQuery({
    queryKey: ["public-videos", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select(`
          id,
          prompt,
          result_url
        `)
        .eq("status", "completed")
        .eq("visibility", "public")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
    keepPreviousData: true
  });

  useEffect(() => {
    if (inView && (hasMoreImages || hasMoreVideos)) {
      setPage(prev => prev + 1);
    }
  }, [inView, hasMoreImages, hasMoreVideos]);

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

  const handleCopyValue = async (id: string, value: number, field: string) => {
    try {
      await navigator.clipboard.writeText(value.toString());
      setCopiedField(`${id}-${field}`);
      toast.success(`${field} value copied`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy value");
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
  const hasContent = images.length > 0 || videos.length > 0;

  const ImageGrid = ({ items = [] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {items.map((image) => (
        <Card key={image.id} className="overflow-hidden bg-gray-900 border-gray-800">
          <div className="relative aspect-square">
            <img
              src={image.result_url!}
              alt={image.prompt}
              className="w-full h-full object-cover"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
          <div className="p-3 md:p-4">
            {image.settings && !isMobile && (
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span>Guidance: {image.settings.guidanceScale}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyValue(image.id, image.settings.guidanceScale, 'guidance')}
                          className="h-6 w-6"
                        >
                          {copiedField === `${image.id}-guidance` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {image.settings.guidanceScale !== 3.5 && (
                      <TooltipContent>
                        <p>Default guidance scale is 3.5, don't forget to adjust for this image</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span>Steps: {image.settings.numInferenceSteps}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyValue(image.id, image.settings.numInferenceSteps, 'steps')}
                          className="h-6 w-6"
                        >
                          {copiedField === `${image.id}-steps` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {image.settings.numInferenceSteps !== 8 && (
                      <TooltipContent>
                        <p>Default steps value is 8, don't forget to adjust for this image</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1 line-clamp-2">{image.prompt}</p>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
          <div className="p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1 line-clamp-2">{video.prompt}</p>
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
    <div className="flex-1 p-3 md:p-8">
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

      {isLoading && page === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : !hasContent ? (
        <div className="text-center py-12 text-gray-500">
          No public content available yet
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value: "all" | "images" | "videos") => setActiveTab(value)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-none">All Content</TabsTrigger>
            <TabsTrigger value="images" className="flex-1 sm:flex-none">Images</TabsTrigger>
            <TabsTrigger value="videos" className="flex-1 sm:flex-none">Videos</TabsTrigger>
          </TabsList>

          <div className="min-h-[calc(100vh-12rem)] mt-6">
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

            {(hasMoreImages || hasMoreVideos) && (
              <div 
                ref={loadMoreRef}
                className="flex justify-center py-8"
              >
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default Explore;
