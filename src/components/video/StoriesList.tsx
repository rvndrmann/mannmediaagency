
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Check, AlertCircle } from "lucide-react";

interface Story {
  "stories id": number;
  story: string | null;
  created_at: string;
  ready_to_go: boolean | null;
  story_metadata: { id: string } | null;
}

interface StoriesListProps {
  stories: Story[];
  selectedStoryId?: number;
  onStorySelect: (id: number) => void;
}

export const StoriesList = ({ stories, selectedStoryId, onStorySelect }: StoriesListProps) => {
  const getStoryPreview = (story: string | null) => {
    if (!story) return "No content";
    return story.length > 100 ? `${story.substring(0, 100)}...` : story;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Stories</h2>
        <span className="text-sm text-gray-400">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </span>
      </div>

      <div className="space-y-3">
        {stories.map((story) => (
          <Card
            key={story["stories id"]}
            className={`p-4 cursor-pointer transition-colors hover:bg-gray-800/60 ${
              selectedStoryId === story["stories id"]
                ? "border-purple-500 bg-gray-800/80"
                : "border-gray-700 bg-gray-800/40"
            }`}
            onClick={() => onStorySelect(story["stories id"])}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-gray-400">
                #{story["stories id"]}
              </span>
              <div className="flex items-center gap-2">
                {story.story_metadata ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Has metadata</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Needs metadata</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-300 line-clamp-2">
                {getStoryPreview(story.story)}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Created: {format(new Date(story.created_at), 'MMM d, yyyy')}</span>
                {story.ready_to_go && (
                  <span className="text-green-400">Ready to go</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
