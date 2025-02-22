
import { ImageCard } from "@/components/dashboard/ImageCard";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

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
    // Filter out any items without result_url for extra safety
    const validImages = images?.filter(img => img.result_url && filterBySearch(img)) || [];
    const validVideos = videos?.filter(vid => vid.result_url && filterBySearch(vid)) || [];
    const validProductShots = productShots?.filter(shot => shot.result_url && filterBySearch(shot)) || [];

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
      {content.map((item: any) => {
        if ('source_image_url' in item && 'scene_description' in item) {
          // This is a product shot
          return (
            <div key={item.id} className="space-y-2">
              <ImageCard image={{
                id: item.id,
                result_url: item.result_url,
                prompt: item.scene_description
              }} />
              <div className="px-4 text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else if ('source_image_url' in item) {
          return (
            <div key={item.id} className="space-y-2">
              <VideoCard video={item} />
              <div className="px-4 text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        } else {
          return (
            <div key={item.id} className="space-y-2">
              <ImageCard image={item} />
              <div className="px-4 text-sm text-muted-foreground">
                by {item.profiles?.username || 'Anonymous'}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
