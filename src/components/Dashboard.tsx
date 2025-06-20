
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
import { UserOrdersList } from "./custom-orders/UserOrdersList";

type ContentType = "stories" | "images";

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ContentType>("stories");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Get the current session
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

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq('user_id', session?.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  // Fetch stories
  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) throw new Error("No user ID");
      
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_metadata (
            seo_title,
            instagram_hashtags
          )
        `)
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  // Fetch images
  const { data: images, isLoading: isLoadingImages } = useQuery({
    queryKey: ["userImages", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          *,
          product_image_metadata (*)
        `)
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  // Fetch videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ["userVideos", session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select(`
          *,
          video_metadata (*)
        `)
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  return (
    <div className="flex-1 p-4 md:p-8 bg-white min-h-screen">
      <AnnouncementBanner />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden text-gray-900" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="mt-6">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger value="stories" className="text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:bg-white">Stories</TabsTrigger>
          <TabsTrigger value="images" className="text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:bg-white">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="stories" className="bg-white">
          <ContentGrid
            stories={stories}
            isLoading={isLoadingStories}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="stories"
          />
        </TabsContent>

        <TabsContent value="images" className="bg-white">
          <ContentGrid
            images={images}
            isLoading={isLoadingImages}
            searchQuery={searchQuery}
            dateRange={dateRange}
            type="images"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
