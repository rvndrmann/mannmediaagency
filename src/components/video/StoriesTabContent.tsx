
import { StoriesList } from "@/components/video/StoriesList";
import { StoryMetadataManager } from "@/components/video/StoryMetadataManager";

interface StoriesTabContentProps {
  stories: any[];
  selectedStoryId?: number;
  onStorySelect: (id: number) => void;
}

export const StoriesTabContent = ({ stories, selectedStoryId, onStorySelect }: StoriesTabContentProps) => {
  return (
    <div className="flex gap-6">
      <div className="w-1/3">
        <StoriesList 
          stories={stories}
          selectedStoryId={selectedStoryId}
          onStorySelect={onStorySelect}
        />
      </div>
      <div className="flex-1">
        {selectedStoryId ? (
          <StoryMetadataManager storyId={selectedStoryId} />
        ) : (
          <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
            Select a story from the list to manage its metadata
          </div>
        )}
      </div>
    </div>
  );
};
