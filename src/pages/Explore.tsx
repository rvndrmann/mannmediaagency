
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { FilterBar } from "@/components/explore/FilterBar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";

const Explore = () => {
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<"all" | "images" | "videos" | "product-shots">("all");
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

  const { data: publicImages, isLoading: imagesLoading } = useQuery({
    queryKey: ["publicImages"],
    queryFn: async () => {
      const { data: images, error: imagesError } = await supabase
        .from("image_generation_jobs")
        .select(`
          *,
          product_image_metadata (*)
        `)
        .eq('visibility', 'public')
        .eq('status', 'completed')
        .not('result_url', 'is', null)
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching public images:', imagesError);
        throw imagesError;
      }

      if (images && images.length > 0) {
        const userIds = [...new Set(images.map(img => img.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        return images.map(img => ({
          ...img,
          profiles: profiles?.find(p => p.id === img.user_id)
        }));
      }

      return images || [];
    },
    enabled: !!session,
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
        .eq('visibility', 'public')
        .eq('status', 'completed')
        .not('result_url', 'is', null)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching public videos:', videosError);
        throw videosError;
      }

      if (videos && videos.length > 0) {
        const userIds = [...new Set(videos.map(vid => vid.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        return videos.map(vid => ({
          ...vid,
          profiles: profiles?.find(p => p.id === vid.user_id)
        }));
      }

      return videos || [];
    },
    enabled: !!session,
  });

  const { data: productShots, isLoading: productShotsLoading } = useQuery({
    queryKey: ["publicProductShots"],
    queryFn: async () => {
      const { data: shots, error: shotsError } = await supabase
        .from("product_shot_history")
        .select("*")
        .order('created_at', { ascending: false });

      if (shotsError) {
        console.error('Error fetching product shots:', shotsError);
        throw shotsError;
      }

      if (shots && shots.length > 0) {
        const userIds = [...new Set(shots.map(shot => shot.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        return shots.map(shot => ({
          ...shot,
          profiles: profiles?.find(p => p.id === shot.user_id)
        }));
      }

      return shots || [];
    },
    enabled: !!session,
  });

  if (!session) return null;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Explore</h1>
              
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <Tabs value={contentType} onValueChange={(value) => setContentType(value as typeof contentType)} className="mt-6">
                <TabsList>
                  <TabsTrigger value="all">All Content</TabsTrigger>
                  <TabsTrigger value="product-shots">Product Shot V2</TabsTrigger>
                  <TabsTrigger value="images">Product Shot V1</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                </TabsList>
              </Tabs>

              <ExploreGrid
                images={publicImages}
                videos={publicVideos}
                productShots={productShots}
                isLoading={imagesLoading || videosLoading || productShotsLoading}
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
