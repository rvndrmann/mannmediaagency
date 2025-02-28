
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

export const ContentGrid = ({
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
    
    // Search in different fields based on content type
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

  const getContent = () => {
    switch (type) {
      case "all":
        return [...filteredStories, ...filteredImages, ...filteredVideos]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "stories":
        return filteredStories;
      case "images":
        return filteredImages;
      case "videos":
        return filteredVideos;
      default:
        return [];
    }
  };

  const content = getContent();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (content.length === 0) {
    return <EmptyState type={type} />;
  }

  // Separate videos from other content
  const videoContent = content.filter(item => 'prompt' in item && 'source_image_url' in item);
  const nonVideoContent = content.filter(item => !('prompt' in item) || !('source_image_url' in item));

  return (
    <div className="grid gap-1 sm:gap-2 md:gap-4">
      {/* Non-video content in 3 columns */}
      {nonVideoContent.length > 0 && (
        <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4">
          {nonVideoContent.map((item) => {
            if ('story' in item) {
              return <StoryCard key={item["stories id"]} story={item} />;
            }
            if ('prompt' in item && 'result_url' in item && !item.source_image_url) {
              return <ImageCard key={item.id} image={item} />;
            }
            return null;
          })}
        </div>
      )}

      {/* Videos in a 2-column layout */}
      {videoContent.length > 0 && (
        <div className="grid grid-cols-2 gap-1 sm:gap-2 md:gap-4 mt-1 sm:mt-2">
          {videoContent.map((item) => (
            <VideoCard key={item.id} video={item} />
          ))}
        </div>
      )}
    </div>
  );
};
