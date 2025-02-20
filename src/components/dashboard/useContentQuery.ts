
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 20;

export const useContentQuery = (type: string, userId: string | undefined, page = 0) => {
  return useQuery({
    queryKey: [type, userId, page],
    queryFn: async () => {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      switch (type) {
        case "stories":
          const { data: stories, error: storiesError } = await supabase
            .from("stories")
            .select('id, created_at, ready_to_go')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(start, end);
          
          if (storiesError) throw storiesError;
          return stories;

        case "images":
          const { data: images, error: imagesError } = await supabase
            .from("image_generation_jobs")
            .select('id, created_at, prompt, result_url')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(start, end);
          
          if (imagesError) throw imagesError;
          return images;

        case "videos":
          const { data: videos, error: videosError } = await supabase
            .from("video_generation_jobs")
            .select('id, created_at, prompt, result_url')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(start, end);
          
          if (videosError) throw videosError;
          return videos;

        default:
          return [];
      }
    },
    enabled: !!userId,
    staleTime: 30000, // Cache data for 30 seconds
    keepPreviousData: true
  });
};
