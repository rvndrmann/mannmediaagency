
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreGrid } from "./ExploreGrid";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const HomeExploreSection = () => {
  const navigate = useNavigate();

  const { data: publicImages, isLoading: imagesLoading } = useQuery({
    queryKey: ["homePublicImages"],
    queryFn: async () => {
      const { data: images, error: imagesError } = await supabase
        .from("image_generation_jobs")
        .select(`
          *,
          product_image_metadata (*)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(8);

      if (imagesError) {
        console.error('Error fetching public images:', imagesError);
        throw imagesError;
      }

      // Fetch the corresponding profiles
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
  });

  const { data: publicVideos, isLoading: videosLoading } = useQuery({
    queryKey: ["homePublicVideos"],
    queryFn: async () => {
      const { data: videos, error: videosError } = await supabase
        .from("video_generation_jobs")
        .select(`
          *,
          video_metadata (*)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(8);

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
  });

  return (
    <div className="py-16 px-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Explore Recent Creations</h2>
          <Button onClick={() => navigate('/explore')} variant="outline">
            View All
          </Button>
        </div>

        <ExploreGrid
          images={publicImages}
          videos={publicVideos}
          isLoading={imagesLoading || videosLoading}
          contentType="all"
          searchQuery=""
        />
      </div>
    </div>
  );
};
