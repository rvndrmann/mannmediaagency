
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

const fetchImages = async (page: number): Promise<PageData<ExploreImageData>> => {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("image_generation_jobs")
    .select(`
      id,
      prompt,
      result_url,
      created_at,
      visibility,
      settings->guidanceScale,
      settings->numInferenceSteps
    `)
    .eq("status", "completed")
    .eq("visibility", "public")
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const items = data.map(item => ({
    id: item.id,
    prompt: item.prompt,
    result_url: item.result_url,
    created_at: item.created_at,
    visibility: item.visibility as "public" | "private",
    settings: {
      guidanceScale: item.guidanceScale || 3.5,
      numInferenceSteps: item.numInferenceSteps || 8
    }
  }));

  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? page + 1 : null
  };
};

const fetchVideos = async (page: number): Promise<PageData<ExploreVideoData>> => {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("video_generation_jobs")
    .select("id, prompt, result_url, created_at, visibility")
    .eq("status", "completed")
    .eq("visibility", "public")
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  const items = data.map(item => ({
    id: item.id,
    prompt: item.prompt,
    result_url: item.result_url,
    created_at: item.created_at,
    visibility: item.visibility as "public" | "private"
  }));

  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? page + 1 : null
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
    queryFn: ({ pageParam }) => fetchImages(pageParam as number),
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
    queryFn: ({ pageParam }) => fetchVideos(pageParam as number),
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
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });
};
