
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

import { BottomNavBar } from "@/components/mobile/BottomNavBar";

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
      const { data: stories, error: storiesError } = await (supabase as any)
        .from("stories")
        .select(`
          *,
          final_video_with_music
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('Error fetching public stories:', JSON.stringify(storiesError, null, 2));
        throw storiesError;
      }
      console.log("Fetched public stories:", stories);
      return stories || [];
    },
  });

  // Fetch all story types
  const { data: storyTypes } = useQuery({
    queryKey: ["storyTypes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("story_type").select("id,name");
      if (error) throw error;
      return data || [];
    },
  });

  // Build a lookup { id → storyType }
  const storyTypeMap = (storyTypes || []).reduce(
    (acc: Record<string, any>, st: any) => ({ ...acc, [st.id]: st }),
    {}
  );

  // Removed publicVideos query and allContent aggregation

  const allContent = [
    ...(publicStories || []).map(item => ({
      ...item,
      type: "story",
      story_type: storyTypeMap[item.story_type_id],
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isLoading = storiesLoading;

  if (!session) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden pb-16 md:pb-0">
        {!isMobile && <Sidebar />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Mann Media Agency</h1>
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <Tabs value={contentType} onValueChange={(value) => setContentType(value as typeof contentType)} className="mt-6">
            <TabsList className="w-full md:w-auto overflow-x-auto">
              <TabsTrigger value="all">All Content</TabsTrigger>
              <TabsTrigger value="stories">Stories</TabsTrigger>
            </TabsList>
          </Tabs>

          <ExploreGrid
            contentItems={allContent}
            isLoading={isLoading}
            contentType={contentType}
            searchQuery={searchQuery}
          />
        </main>
        <BottomNavBar />
      </div>
    </SidebarProvider>
  );
};

export default Explore;
