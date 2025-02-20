
import { memo, Suspense } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ContentGrid } from "./ContentGrid";
import { TabNavigation } from "./TabNavigation";
import { Button } from "@/components/ui/button";
import { useContentQuery } from "./useContentQuery";

type ContentType = "all" | "stories" | "images" | "videos";

interface DashboardContentProps {
  userId?: string;
  activeTab: ContentType;
  page: number;
  searchQuery: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onTabChange: (value: ContentType) => void;
  onLoadMore: () => void;
}

export const DashboardContent = memo(({
  userId,
  activeTab,
  page,
  searchQuery,
  dateRange,
  onTabChange,
  onLoadMore
}: DashboardContentProps) => {
  const {
    data: stories,
    isLoading: isLoadingStories,
  } = useContentQuery("stories", userId, page);

  const {
    data: images,
    isLoading: isLoadingImages,
  } = useContentQuery("images", userId, page);

  const {
    data: videos,
    isLoading: isLoadingVideos,
  } = useContentQuery("videos", userId, page);

  const shouldShowLoadMore = (activeTab === "all" && (stories?.length || images?.length || videos?.length)) ||
    (activeTab === "stories" && stories?.length) ||
    (activeTab === "images" && images?.length) ||
    (activeTab === "videos" && videos?.length);

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ContentType)} className="mt-6">
      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />

      <Suspense fallback={<div>Loading...</div>}>
        <TabsContent value="all">
          <ContentGrid
            stories={stories}
            images={images}
            videos={videos}
            isLoading={isLoadingStories || isLoadingImages || isLoadingVideos}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="all"
          />
        </TabsContent>

        <TabsContent value="stories">
          <ContentGrid
            stories={stories}
            isLoading={isLoadingStories}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="stories"
          />
        </TabsContent>

        <TabsContent value="images">
          <ContentGrid
            images={images}
            isLoading={isLoadingImages}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="images"
          />
        </TabsContent>

        <TabsContent value="videos">
          <ContentGrid
            videos={videos}
            isLoading={isLoadingVideos}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="videos"
          />
        </TabsContent>
      </Suspense>

      {shouldShowLoadMore && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={onLoadMore}
            variant="outline"
            disabled={isLoadingStories || isLoadingImages || isLoadingVideos}
          >
            Load More
          </Button>
        </div>
      )}
    </Tabs>
  );
});

DashboardContent.displayName = "DashboardContent";
