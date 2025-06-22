
import { ImageCard } from "@/components/dashboard/ImageCard";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { Card } from "@/components/ui/card";
import { ImageIcon, BadgeCheck, Sparkles, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExploreGridProps {
  images?: any[];
  videos?: any[];
  stories?: any[];
  productShots?: any[];
  isLoading: boolean;
  contentType: "all" | "images" | "videos" | "product-shots" | "stories";
  searchQuery: string;
}

export const ExploreGrid = ({
  images = [],
  videos = [],
  stories = [],
  productShots = [],
  isLoading,
  contentType,
  searchQuery,
}: ExploreGridProps) => {
  const filterBySearch = (content: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (content.prompt?.toLowerCase().includes(query) || 
            content.scene_description?.toLowerCase().includes(query));
  };

  const getContent = () => {
    const validImages = images?.filter(img => img.result_url && filterBySearch(img)) || [];
    const validVideos = videos?.filter(vid => vid.result_url && filterBySearch(vid)) || [];
    const validProductShots = productShots?.filter(shot => shot.result_url && filterBySearch(shot)) || [];
    const validStories = stories?.filter(story => filterBySearch(story)) || [];

    switch (contentType) {
      case "all":
        // Add stories, then videos, then images and product shots
        return [...validStories, ...validVideos, ...validImages, ...validProductShots]
          .sort((a, b) => {
            // Prioritize stories, then videos, then others
            const aIsStory = 'story' in a && !('source_image_url' in a) && !('scene_description' in a);
            const bIsStory = 'story' in b && !('source_image_url' in b) && !('scene_description' in b);
            const aIsVideo = 'source_image_url' in a && !('scene_description' in a) && !aIsStory;
            const bIsVideo = 'source_image_url' in b && !('scene_description' in b) && !bIsStory;

            if (aIsStory && !bIsStory) return -1;
            if (!aIsStory && bIsStory) return 1;
            if (aIsVideo && !bIsVideo) return -1;
            if (!aIsVideo && bIsVideo) return 1;
            
            // If both are the same type or neither are prioritized, sort by date
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
      case "images":
        return validImages;
      case "videos":
        return validVideos;
      case "stories":
        return validStories;
      case "product-shots":
        return validProductShots;
      default:
        return [];
    }
  };

  const isV2Image = (item: any) => {
    if (productShots?.some(shot => shot.id === item.id)) {
      return true;
    }
    if (images?.some(img => img.id === item.id)) {
      return false;
    }
    if (item.settings && typeof item.settings === 'string') {
      try {
        const settings = JSON.parse(item.settings);
        return !!settings.optimize_description;
      } catch {
        return false;
      }
    } else if (item.settings) {
      return !!item.settings.optimize_description;
    }
    return false;
  };

  const getAspectRatio = (item: any) => {
    if (item.settings && typeof item.settings === 'string') {
      try {
        const settings = JSON.parse(item.settings);
        return settings.aspectRatio;
      } catch {
        return null;
      }
    } else if (item.settings) {
      return item.settings.aspectRatio;
    }
    return null;
  };

  const content = getContent();

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  if (content.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No content found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-3 mt-4 sm:mt-6 w-full overflow-hidden px-1">
      {content.map((item: any) => {
        if ('story' in item && !('source_image_url' in item) && !('scene_description' in item)) { // Check if it's a story
          // Assuming StoryCard component exists and accepts a story prop
          // You might need to create or import StoryCard if it doesn't exist
          // For now, using a placeholder rendering
          return (
            <div key={item["stories id"]} className="space-y-1 sm:space-y-2 w-full">
              <Card className="p-4">
                <h3 className="font-medium">Story #{item["stories id"]}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.story}</p>
                <div className="text-[7px] sm:text-xs text-muted-foreground truncate mt-1">
                  by {item.profiles?.username || 'Anonymous'}
                </div>
              </Card>
            </div>
          );
        } else if ('source_image_url' in item && 'scene_description' in item) {
          const isV2 = contentType === "product-shots" ? true : 
                      contentType === "images" ? false :
                      isV2Image(item);
          const aspectRatio = getAspectRatio(item);
          
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2 w-full">
              <div className="relative w-full">
                <ImageCard image={{
                  id: item.id,
                  result_url: item.result_url,
                  prompt: item.scene_description
                }} />
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-wrap gap-0.5 sm:gap-1 max-w-[80%]">
                  {isV2 ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0 text-[7px] sm:text-[10px] px-1 py-0">
                      <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                      V2
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0 text-[7px] sm:text-[10px] px-1 py-0">
                      <BadgeCheck className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                      V1
                    </Badge>
                  )}
                  {aspectRatio && (
                    <Badge variant="outline" className="bg-background/80 text-[7px] sm:text-[10px] px-1 py-0">
                      <ArrowUpDown className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                      {aspectRatio}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="px-0.5 sm:px-2 text-[7px] sm:text-xs text-muted-foreground truncate">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else if ('source_image_url' in item) {
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2 w-full">
              <VideoCard video={item} />
              <div className="px-0.5 sm:px-2 text-[7px] sm:text-xs text-muted-foreground truncate">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else {
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2 w-full">
              <ImageCard image={item} />
              <div className="px-0.5 sm:px-2 text-[7px] sm:text-xs text-muted-foreground truncate">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
