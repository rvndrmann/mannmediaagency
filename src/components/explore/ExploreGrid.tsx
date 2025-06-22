import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

interface ExploreGridProps {
  stories?: any[];
  isLoading: boolean;
  contentType: "all" | "stories";
  searchQuery: string;
}

export const ExploreGrid = ({
  stories = [],
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
      content.scene_description?.toLowerCase().includes(query)
    );
  };

  const getContent = () => {
    const validStories = stories?.filter(story => filterBySearch(story)) || [];
    switch (contentType) {
      case "all":
        return [...validStories].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "stories":
        return validStories;
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
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-3 mt-4 sm:mt-6 w-full overflow-hidden px-1">
      {content.map((item: any) => (
        <div key={item["stories id"]} className="space-y-1 sm:space-y-2 w-full">
          <Card className="p-4">
            <h3 className="font-medium">Story #{item["stories id"]}</h3>
            <p className="text-sm text-muted-foreground truncate">{item.story}</p>
            <div className="text-[7px] sm:text-xs text-muted-foreground truncate mt-1">
              by {item.profiles?.username || "Anonymous"}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};
