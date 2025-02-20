
import { memo } from "react";
import { StoryCard } from "./StoryCard";
import { ImageCard } from "./ImageCard";
import { VideoCard } from "./VideoCard";
import { EmptyState } from "./EmptyState";
import { Database } from "@/integrations/supabase/types";

interface ContentGridProps {
  stories?: any[];
  images?: any[];
  videos?: any[];
  isLoading: boolean;
  searchQuery: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  type: "all" | "stories" | "images" | "videos";
}

export const ContentGrid = memo(({
  stories = [],
  images = [],
  videos = [],
  isLoading,
  searchQuery,
  dateRange,
  type
}: ContentGridProps) => {
  const filterByDate = (date: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const itemDate = new Date(date);
    if (dateRange.from && dateRange.to) {
      return itemDate >= dateRange.from && itemDate <= dateRange.to;
    }
    if (dateRange.from) return itemDate >= dateRange.from;
    if (dateRange.to) return itemDate <= dateRange.to;
    return true;
  };

  const filterBySearch = (content: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if ('story' in content) {
      return content.story?.toLowerCase().includes(query) ||
             content.story_metadata?.seo_title?.toLowerCase().includes(query);
    }
    if ('prompt' in content) {
      return content.prompt.toLowerCase().includes(query);
    }
    return false;
  };

  const filteredStories = stories.filter(s => filterByDate(s.created_at) && filterBySearch(s));
  const filteredImages = images.filter(i => filterByDate(i.created_at) && filterBySearch(i));
  const filteredVideos = videos.filter(v => filterByDate(v.created_at) && filterBySearch(v));

  const content = type === "all" 
    ? [...filteredStories, ...filteredImages, ...filteredVideos]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : type === "stories" ? filteredStories
    : type === "images" ? filteredImages
    : filteredVideos;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (content.length === 0) {
    return <EmptyState type={type} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {content.map((item) => {
        if ('story' in item) {
          return <StoryCard key={item.id} story={item} />;
        }
        if ('prompt' in item && 'result_url' in item && !item.source_image_url) {
          return <ImageCard key={item.id} image={item} />;
        }
        if ('prompt' in item && 'source_image_url' in item) {
          return <VideoCard key={item.id} video={item} />;
        }
        return null;
      })}
    </div>
  );
});

ContentGrid.displayName = "ContentGrid";
