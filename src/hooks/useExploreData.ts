
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 12;

export interface ExploreImageData {
  id: string;
  prompt: string;
  result_url: string | null;
  created_at: string;
  visibility: "public" | "private";
  settings: {
    guidanceScale: number;
    numInferenceSteps: number;
  };
}

export interface ExploreVideoData {
  id: string;
  prompt: string;
  result_url: string | null;
  created_at: string;
  visibility: "public" | "private";
}

interface PageData<T> {
  items: T[];
  nextCursor: number | null;
}

const fetchImages = async (pageParam: number): Promise<PageData<ExploreImageData>> => {
  const start = pageParam * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("image_generation_jobs")
    .select(`
      id,
      prompt,
      result_url,
      created_at,
      visibility,
      settings
    `)
    .eq("status", "completed")
    .eq("visibility", "public")
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const items = (data || []).map(item => ({
    id: item.id,
    prompt: item.prompt,
    result_url: item.result_url,
    created_at: item.created_at,
    visibility: item.visibility as "public" | "private",
    settings: {
      guidanceScale: item.settings?.guidanceScale || 3.5,
      numInferenceSteps: item.settings?.numInferenceSteps || 8
    }
  }));

  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? pageParam + 1 : null
  };
};

const fetchVideos = async (pageParam: number): Promise<PageData<ExploreVideoData>> => {
  const start = pageParam * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("video_generation_jobs")
    .select("id, prompt, result_url, created_at, visibility")
    .eq("status", "completed")
    .eq("visibility", "public")
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const items = (data || []).map(item => ({
    id: item.id,
    prompt: item.prompt,
    result_url: item.result_url,
    created_at: item.created_at,
    visibility: item.visibility as "public" | "private"
  }));

  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? pageParam + 1 : null
  };
};

export const useExploreData = (session: any) => {
  const { 
    data: imagesData,
    isLoading: imagesLoading,
    fetchNextPage: fetchMoreImages,
    hasNextPage: hasMoreImages,
  } = useInfiniteQuery({
    queryKey: ["public-images"],
    queryFn: ({ pageParam }) => fetchImages(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!session,
  });

  const {
    data: videosData,
    isLoading: videosLoading,
    fetchNextPage: fetchMoreVideos,
    hasNextPage: hasMoreVideos,
  } = useInfiniteQuery({
    queryKey: ["public-videos"],
    queryFn: ({ pageParam }) => fetchVideos(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!session,
  });

  return {
    images: imagesData?.pages.flatMap(page => page.items) || [],
    videos: videosData?.pages.flatMap(page => page.items) || [],
    isLoading: imagesLoading || videosLoading,
    hasMoreImages,
    hasMoreVideos,
    fetchMoreImages,
    fetchMoreVideos
  };
};

export const useSession = () => {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
      } catch (error) {
        console.error("Session error:", error);
        return null;
      }
    },
    retry: false
  });
};
