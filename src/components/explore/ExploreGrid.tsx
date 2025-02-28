
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

  // Create a function to deduplicate content by result_url
  const removeDuplicates = (items: any[]) => {
    const uniqueUrls = new Set();
    return items.filter(item => {
      const url = item.result_url;
      if (!url || uniqueUrls.has(url)) return false;
      uniqueUrls.add(url);
      return true;
    });
  };

  const getContent = () => {
    // Deduplicate images, videos and product shots
    const validImages = removeDuplicates(images?.filter(img => img.result_url && filterBySearch(img)) || []);
    const validVideos = removeDuplicates(videos?.filter(vid => vid.result_url && filterBySearch(vid)) || []);
    const validProductShots = removeDuplicates(productShots?.filter(shot => shot.result_url && filterBySearch(shot)) || []);

    switch (contentType) {
      case "all":
        return [...validImages, ...validVideos, ...validProductShots]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    // Check if the item is in the productShots array
    if (productShots?.some(shot => shot.id === item.id)) {
      return true;
    }
    
    // Check in images array
    if (images?.some(img => img.id === item.id)) {
      return false;
    }
    
    // Handle settings detection with better error handling
    if (item.settings) {
      if (typeof item.settings === 'string') {
        try {
          const settings = JSON.parse(item.settings);
          return !!settings.optimize_description;
        } catch {
          return false;
        }
      } else {
        return !!item.settings.optimize_description;
      }
    }
    
    // Default case for product shots that don't have optimize_description setting
    if (item.scene_description) {
      return true;
    }
    
    return false;
  };

  const getAspectRatio = (item: any) => {
    if (item.settings) {
      if (typeof item.settings === 'string') {
        try {
          const settings = JSON.parse(item.settings);
          return settings.aspectRatio;
        } catch {
          return null;
        }
      } else if (item.settings.aspectRatio) {
        return item.settings.aspectRatio;
      }
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

  // Separate videos and non-videos for different layout treatments
  const videoContent = content.filter(item => 'source_image_url' in item && !('scene_description' in item));
  const nonVideoContent = content.filter(item => !('source_image_url' in item) || 'scene_description' in item);

  return (
    <div className="space-y-4 mt-2 sm:mt-4 md:mt-6">
      {/* Images in 3 columns */}
      {nonVideoContent.length > 0 && (
        <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4">
          {nonVideoContent.map((item: any) => {
            if ('source_image_url' in item && 'scene_description' in item) {
              const isV2 = contentType === "product-shots" ? true : 
                          contentType === "images" ? false :
                          isV2Image(item);
              const aspectRatio = getAspectRatio(item);
              
              return (
                <div key={item.id} className="space-y-0.5 sm:space-y-2">
                  <div className="relative">
                    <ImageCard image={{
                      id: item.id,
                      result_url: item.result_url,
                      prompt: item.scene_description || ""
                    }} />
                    <div className="absolute top-1 right-1 flex gap-0.5 sm:gap-2">
                      {isV2 ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0 text-[8px] sm:text-xs py-0 px-1">
                          <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                          V2
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0 text-[8px] sm:text-xs py-0 px-1">
                          <BadgeCheck className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                          V1
                        </Badge>
                      )}
                      {aspectRatio && (
                        <Badge variant="outline" className="bg-background/80 text-[8px] sm:text-xs py-0 px-1">
                          <ArrowUpDown className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                          {aspectRatio}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="px-1 sm:px-4 text-[8px] sm:text-sm text-muted-foreground">
                    by {item.profiles?.username || 'Anonymous'}
                  </div>
                </div>
              );
            } else {
              return (
                <div key={item.id} className="space-y-0.5 sm:space-y-2">
                  <ImageCard image={item} />
                  <div className="px-1 sm:px-4 text-[8px] sm:text-sm text-muted-foreground">
                    by {item.profiles?.username || 'Anonymous'}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Videos in 2 columns */}
      {videoContent.length > 0 && (
        <div className="grid grid-cols-2 gap-1 sm:gap-2 md:gap-4">
          {videoContent.map((item: any) => (
            <div key={item.id} className="space-y-0.5 sm:space-y-2">
              <VideoCard video={item} />
              <div className="px-1 sm:px-4 text-[8px] sm:text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
