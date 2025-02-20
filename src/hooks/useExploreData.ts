
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

const fetchImages = async (pageParam: number): Promise<ExploreImageData[]> => {
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
      settings->guidanceScale,
      settings->numInferenceSteps
    `)
    .eq("status", "completed")
    .eq("visibility", "public")
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data.map(item => ({
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
};

const fetchVideos = async (pageParam: number): Promise<ExploreVideoData[]> => {
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
  
  return data.map(item => ({
    id: item.id,
    prompt: item.prompt,
    result_url: item.result_url,
    created_at: item.created_at,
    visibility: item.visibility as "public" | "private"
  }));
};

export const useExploreData = (session: any) => {
  const { 
    data: imagesData,
    isLoading: imagesLoading,
    fetchNextPage: fetchMoreImages,
    hasNextPage: hasMoreImages,
  } = useInfiniteQuery({
    queryKey: ["public-images"],
    queryFn: async ({ pageParam }) => ({
      pageParam,
      data: await fetchImages(pageParam as number)
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => 
      lastPage.data.length === PAGE_SIZE ? lastPage.pageParam + 1 : undefined,
    enabled: !!session,
  });

  const {
    data: videosData,
    isLoading: videosLoading,
    fetchNextPage: fetchMoreVideos,
    hasNextPage: hasMoreVideos,
  } = useInfiniteQuery({
    queryKey: ["public-videos"],
    queryFn: async ({ pageParam }) => ({
      pageParam,
      data: await fetchVideos(pageParam as number)
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => 
      lastPage.data.length === PAGE_SIZE ? lastPage.pageParam + 1 : undefined,
    enabled: !!session,
  });

  return {
    images: imagesData?.pages.flatMap(page => page.data) || [],
    videos: videosData?.pages.flatMap(page => page.data) || [],
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
