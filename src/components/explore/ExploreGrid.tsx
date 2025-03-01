
import { ImageCard } from "@/components/dashboard/ImageCard";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { Card } from "@/components/ui/card";
import { ImageIcon, BadgeCheck, Sparkles, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExploreGridProps {
  images?: any[];
  videos?: any[];
  productShots?: any[];
  isLoading: boolean;
  contentType: "all" | "images" | "videos" | "product-shots";
  searchQuery: string;
}

export const ExploreGrid = ({
  images = [],
  videos = [],
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

    switch (contentType) {
      case "all":
        // First add videos, then add images and product shots
        return [...validVideos, ...validImages, ...validProductShots]
          .sort((a, b) => {
            // If one is a video and one is not, prioritize videos
            const aIsVideo = 'source_image_url' in a && !('scene_description' in a);
            const bIsVideo = 'source_image_url' in b && !('scene_description' in b);
            
            if (aIsVideo && !bIsVideo) return -1; // a is video, b is not, so a comes first
            if (!aIsVideo && bIsVideo) return 1; // b is video, a is not, so b comes first
            
            // If both are the same type, sort by date
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
      case "images":
        return validImages;
      case "videos":
        return validVideos;
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
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
      {content.map((item: any) => {
        if ('source_image_url' in item && 'scene_description' in item) {
          const isV2 = contentType === "product-shots" ? true : 
                      contentType === "images" ? false :
                      isV2Image(item);
          const aspectRatio = getAspectRatio(item);
          
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2">
              <div className="relative">
                <ImageCard image={{
                  id: item.id,
                  result_url: item.result_url,
                  prompt: item.scene_description
                }} />
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1 sm:gap-2">
                  {isV2 ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0 text-[10px] sm:text-xs">
                      <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      V2
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0 text-[10px] sm:text-xs">
                      <BadgeCheck className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      V1
                    </Badge>
                  )}
                  {aspectRatio && (
                    <Badge variant="outline" className="bg-background/80 text-[10px] sm:text-xs">
                      <ArrowUpDown className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      {aspectRatio}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="px-2 sm:px-4 text-[10px] sm:text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else if ('source_image_url' in item) {
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2">
              <VideoCard video={item} />
              <div className="px-2 sm:px-4 text-[10px] sm:text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else {
          return (
            <div key={item.id} className="space-y-1 sm:space-y-2">
              <ImageCard image={item} />
              <div className="px-2 sm:px-4 text-[10px] sm:text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
