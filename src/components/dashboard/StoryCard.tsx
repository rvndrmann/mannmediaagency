
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Video } from "lucide-react";

export interface StoryCardProps {
  story: {
    "stories id": number;
    created_at: string;
    ready_to_go: boolean;
    final_video_with_music: string;
    video_length_seconds: number;
    story_metadata?: {
      seo_title: string;
      instagram_hashtags: string;
    };
  };
}

export const StoryCard = ({ story }: StoryCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        {story.final_video_with_music ? (
          <video
            src={story.final_video_with_music}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Video className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
          </div>
        )}
      </div>
      <div className="p-1 sm:p-2 space-y-0.5 sm:space-y-1">
        <div className="flex items-center justify-between">
          <Badge 
            variant={story.ready_to_go ? "default" : "secondary"}
            className="text-[8px] sm:text-xs py-0 px-1 sm:px-2"
          >
            {story.ready_to_go ? "Ready" : "Processing"}
          </Badge>
        </div>
        {story.story_metadata?.seo_title && (
          <p className="text-[10px] sm:text-xs font-medium line-clamp-1">
            {story.story_metadata.seo_title}
          </p>
        )}
        <p className="text-[8px] sm:text-[10px] text-gray-500">
          {formatDate(story.created_at)}
        </p>
      </div>
    </Card>
  );
};
