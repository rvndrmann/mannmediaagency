import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

interface ExploreGridProps {
  contentItems?: any[];
  isLoading: boolean;
  contentType: "all" | "stories" | "videos";
  searchQuery: string;
}

export const ExploreGrid = ({
  contentItems = [],
  isLoading,
  contentType,
  searchQuery,
}: ExploreGridProps) => {
  const filterBySearch = (content: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      content.story?.toLowerCase().includes(query) ||
      content.prompt?.toLowerCase().includes(query) ||
      content.scene_description?.toLowerCase().includes(query) ||
      content.video_metadata?.seo_title?.toLowerCase().includes(query)
    );
  };

  const getContent = () => {
    const filteredContent = contentItems?.filter(item => filterBySearch(item)) || [];
    switch (contentType) {
      case "all":
        return filteredContent.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "stories":
        return filteredContent.filter(item => item.type === "story");
      case "videos":
        return filteredContent.filter(item => item.type === "video");
      default:
        return [];
    }
  };

  const contentToDisplay = getContent();

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  if (contentToDisplay.length === 0) {
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
      {contentToDisplay.map((item: any) => (
        <div key={item.id || item["stories id"]} className="space-y-1 sm:space-y-2 w-full">
          <Card className="p-4">
            {item.type === "story" && (
              <>
                <h3 className="font-medium">Story #{item["stories id"]}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.story}</p>
                {item.final_video_with_music && (
                  <video
                    src={item.final_video_with_music}
                    controls
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                <div className="text-[7px] sm:text-xs text-muted-foreground truncate mt-1">
                  by {item.profiles?.username || "Anonymous"}
                </div>
              </>
            )}
            {item.type === "video" && (
              <>
                <h3 className="font-medium">Video #{item.id}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.prompt}</p>
                {item.video_metadata?.video_url && (
                  <video
                    src={item.video_metadata.video_url}
                    controls
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                <div className="text-[7px] sm:text-xs text-muted-foreground truncate mt-1">
                  by {item.profiles?.username || "Anonymous"}
                </div>
              </>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
};
