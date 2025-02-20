
import { useState, lazy, Suspense } from "react";
import { useInView } from "react-intersection-observer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExploreData, useSession } from "@/hooks/useExploreData";
import { useExploreActions } from "@/components/explore/ExploreActions";
import { ExploreHeader } from "@/components/explore/ExploreHeader";

const ImageGrid = lazy(() => import("@/components/explore/ImageGrid"));
const VideoGrid = lazy(() => import("@/components/explore/VideoGrid"));

export const Explore = () => {
  const isMobile = useIsMobile();
  const [copiedPrompts, setCopiedPrompts] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "images" | "videos">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  const { data: session } = useSession();
  const {
    images,
    videos,
    isLoading,
    hasMoreImages,
    hasMoreVideos,
    fetchMoreImages,
    fetchMoreVideos
  } = useExploreData(session);

  const { handleCopyPrompt, handleCopyValue, handleDownload } = useExploreActions();

  // Load more content when scrolling
  if (inView) {
    if (hasMoreImages) fetchMoreImages();
    if (hasMoreVideos) fetchMoreVideos();
  }

  const hasContent = images.length > 0 || videos.length > 0;

  return (
    <div className="flex-1 p-3 md:p-8">
      <ExploreHeader />

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
                  {images?.length > 0 && (
                    <ImageGrid
                      items={images}
                      onCopyPrompt={(id, prompt) => handleCopyPrompt(id, prompt, setCopiedPrompts)}
                      onCopyValue={(id, value, field) => handleCopyValue(id, value, field, setCopiedField)}
                      onDownload={handleDownload}
                      copiedField={copiedField}
                      copiedPrompts={copiedPrompts}
                      isMobile={isMobile}
                    />
                  )}
                  {videos?.length > 0 && (
                    <div className="mt-8">
                      <VideoGrid
                        items={videos}
                        onCopyPrompt={(id, prompt) => handleCopyPrompt(id, prompt, setCopiedPrompts)}
                        onDownload={handleDownload}
                        copiedPrompts={copiedPrompts}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="images" className="m-0">
                {images?.length > 0 ? (
                  <ImageGrid
                    items={images}
                    onCopyPrompt={(id, prompt) => handleCopyPrompt(id, prompt, setCopiedPrompts)}
                    onCopyValue={(id, value, field) => handleCopyValue(id, value, field, setCopiedField)}
                    onDownload={handleDownload}
                    copiedField={copiedField}
                    copiedPrompts={copiedPrompts}
                    isMobile={isMobile}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No public images available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="videos" className="m-0">
                {videos?.length > 0 ? (
                  <VideoGrid
                    items={videos}
                    onCopyPrompt={(id, prompt) => handleCopyPrompt(id, prompt, setCopiedPrompts)}
                    onDownload={handleDownload}
                    copiedPrompts={copiedPrompts}
                  />
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
