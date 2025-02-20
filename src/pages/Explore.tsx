import { useState, useEffect, lazy, Suspense } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const ImageGrid = lazy(() => import("@/components/explore/ImageGrid"));
const VideoGrid = lazy(() => import("@/components/explore/VideoGrid"));

interface BaseItem {
  id: string;
  prompt: string;
  result_url: string;
}

interface ImageData extends BaseItem {
  settings: {
    guidanceScale: number;
    numInferenceSteps: number;
  };
}

interface VideoData extends BaseItem {}

type QueryFnResponse<T> = {
  pages: T[][];
  pageParams: number[];
};

export const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [copiedPrompts, setCopiedPrompts] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "images" | "videos">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { 
    data: imagesData,
    isLoading: imagesLoading,
    fetchNextPage: fetchMoreImages,
    hasNextPage: hasMoreImages,
  } = useInfiniteQuery<ImageData[]>({
    queryKey: ["public-images"],
    queryFn: async ({ pageParam = 0 }) => {
      const start = pageParam * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

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
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        prompt: item.prompt,
        result_url: item.result_url,
        settings: {
          guidanceScale: item.guidanceScale,
          numInferenceSteps: item.numInferenceSteps
        }
      }));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!session,
  });

  const {
    data: videosData,
    isLoading: videosLoading,
    fetchNextPage: fetchMoreVideos,
    hasNextPage: hasMoreVideos,
  } = useInfiniteQuery({
    queryKey: ["public-videos"] as const,
    queryFn: async ({ pageParam = 0 }) => {
      const start = pageParam * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("id, prompt, result_url")
        .eq("status", "completed")
        .eq("visibility", "public")
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!session,
  });

  useEffect(() => {
    if (inView) {
      if (hasMoreImages) fetchMoreImages();
      if (hasMoreVideos) fetchMoreVideos();
    }
  }, [inView, hasMoreImages, hasMoreVideos, fetchMoreImages, fetchMoreVideos]);

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
  const images = imagesData?.pages?.flatMap(page => page) || [];
  const videos = videosData?.pages?.flatMap(page => page) || [];
  const hasContent = images.length > 0 || videos.length > 0;

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

      {isLoading && !hasContent ? (
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
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-purple-600" />}>
              <TabsContent value="all" className="m-0">
                <div className="space-y-8">
                  {images?.length ? <ImageGrid items={images} onCopyPrompt={handleCopyPrompt} onCopyValue={handleCopyValue} onDownload={handleDownload} copiedField={copiedField} copiedPrompts={copiedPrompts} isMobile={isMobile} /> : null}
                  {videos?.length ? (
                    <div className="mt-8">
                      <VideoGrid items={videos} onCopyPrompt={handleCopyPrompt} onDownload={handleDownload} copiedPrompts={copiedPrompts} />
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="images" className="m-0">
                {images?.length ? (
                  <ImageGrid items={images} onCopyPrompt={handleCopyPrompt} onCopyValue={handleCopyValue} onDownload={handleDownload} copiedField={copiedField} copiedPrompts={copiedPrompts} isMobile={isMobile} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No public images available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="videos" className="m-0">
                {videos?.length ? (
                  <VideoGrid items={videos} onCopyPrompt={handleCopyPrompt} onDownload={handleDownload} copiedPrompts={copiedPrompts} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No public videos available
                  </div>
                )}
              </TabsContent>
            </Suspense>

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
