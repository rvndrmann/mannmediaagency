
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContentGrid } from "./dashboard/ContentGrid";
import { FilterBar } from "./dashboard/FilterBar";
import { AnnouncementBanner } from "./announcements/AnnouncementBanner";

type ContentType = "all" | "stories" | "images" | "videos";

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ContentType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch stories
  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_metadata (
            seo_title,
            instagram_hashtags
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch images
  const { data: images, isLoading: isLoadingImages } = useQuery({
    queryKey: ["userImages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          *,
          product_image_metadata (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ["userVideos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select(`
          *,
          video_metadata (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex-1 p-4 md:p-8">
      <AnnouncementBanner />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="stories">Stories</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
};
