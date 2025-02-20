
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ContentGrid } from "./dashboard/ContentGrid";
import { FilterBar } from "./dashboard/FilterBar";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { TabNavigation } from "./dashboard/TabNavigation";
import { useContentQuery } from "./dashboard/useContentQuery";
import { Button } from "./ui/button";

type ContentType = "all" | "stories" | "images" | "videos";

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<ContentType>("all");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const {
    data: stories,
    isLoading: isLoadingStories,
  } = useContentQuery("stories", session?.user?.id, page);

  const {
    data: images,
    isLoading: isLoadingImages,
  } = useContentQuery("images", session?.user?.id, page);

  const {
    data: videos,
    isLoading: isLoadingVideos,
  } = useContentQuery("videos", session?.user?.id, page);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const shouldShowLoadMore = (activeTab === "all" && (stories?.length || images?.length || videos?.length)) ||
    (activeTab === "stories" && stories?.length) ||
    (activeTab === "images" && images?.length) ||
    (activeTab === "videos" && videos?.length);

  return (
    <div className="flex-1 p-4 md:p-8">
      <DashboardHeader />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="mt-6">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

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
              onClick={handleLoadMore}
              variant="outline"
              disabled={isLoadingStories || isLoadingImages || isLoadingVideos}
            >
              Load More
            </Button>
          </div>
        )}
      </Tabs>
    </div>
  );
};
