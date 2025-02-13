
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface StoryCardProps {
  story: {
    "stories id": number;
    created_at: string;
    ready_to_go: boolean;
    final_video_with_music: string | null;
    video_length_seconds: number | null;
    story_metadata?: {
      seo_title: string | null;
    } | null;
  };
  onVideoLoad: (story: any, duration: number) => void;
}

export const StoryCard = ({ story, onVideoLoad }: StoryCardProps) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden w-full max-w-[300px]">
      <div className="p-2 border-b border-gray-200">
        <Badge variant="secondary" className="text-xs">
          Story #{story["stories id"]}
        </Badge>
      </div>
      <div className="aspect-video bg-gray-100">
        {story.final_video_with_music ? (
          <div className="flex flex-col items-center gap-1 p-2">
            <video 
              src={story.final_video_with_music} 
              controls 
              className="w-full h-full object-cover rounded"
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                onVideoLoad(story, video.duration);
              }}
            />
            <div className="flex items-center justify-between w-full mt-1">
              {story.video_length_seconds && (
                <div className="flex items-center text-xs text-gray-600">
                  <Video className="w-3 h-3 mr-1" />
                  {formatDuration(story.video_length_seconds)}
                  <div className="ml-2 flex items-center text-blue-500">
                    <span className="text-xs">Click three dots to download</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-400 text-sm">Processing...</div>
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {story.story_metadata?.seo_title && (
          <p className="text-sm font-medium line-clamp-2">
            {story.story_metadata.seo_title}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Created: {formatDate(story.created_at)}
        </p>
        <p className="text-xs text-gray-500">
          Status: {story.ready_to_go ? "Ready" : "Processing"}
        </p>
      </div>
    </Card>
  );
};
