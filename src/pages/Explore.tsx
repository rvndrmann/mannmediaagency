
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { FilterBar } from "@/components/explore/FilterBar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contentType, setContentType] = useState<"all" | "stories">("all");
  const [searchQuery, setSearchQuery] = useState("");

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


  const { data: publicStories, isLoading: storiesLoading } = useQuery({
    queryKey: ["publicStories"],
    queryFn: async () => {
      const { data: stories, error: storiesError } = await supabase
        .from("stories")
        .select(`
          *,
          final_video_with_music,
          profiles (id, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('Error fetching public stories:', storiesError);
        throw storiesError;
      }
      return stories || [];
    },
  });

  const { data: publicVideos, isLoading: videosLoading } = useQuery({
    queryKey: ["publicVideos"],
    queryFn: async () => {
      const { data: videos, error: videosError } = await supabase
        .from("video_generation_jobs")
        .select(`
          *,
          video_metadata (*)
        `)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching public videos:', videosError);
        throw videosError;
      }
      return videos || [];
    },
  });

  const allContent = [
    ...(publicStories || []).map(item => ({ ...item, type: "story" })),
    ...(publicVideos || []).map(item => ({ ...item, type: "video" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isLoading = storiesLoading || videosLoading;

  if (!session) return null;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
              {isMobile ? (
                <div className="flex items-center p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="mr-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h1 className="text-xl font-bold">Explore</h1>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(-1)}
                      className="mr-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">Explore</h1>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 md:p-8 ${isMobile ? 'pt-20' : 'pt-20'}`}>
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <Tabs value={contentType} onValueChange={(value) => setContentType(value as typeof contentType)} className="mt-6">
                <TabsList className="w-full md:w-auto overflow-x-auto">
                  <TabsTrigger value="all">All Content</TabsTrigger>
                  <TabsTrigger value="stories">Stories</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                </TabsList>
              </Tabs>

              <ExploreGrid
                contentItems={allContent}
                isLoading={isLoading}
                contentType={contentType}
                searchQuery={searchQuery}
              />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Explore;
