import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Video } from "lucide-react";

export interface StoryCardProps {
  story: {
    "stories id": number;
    created_at: string;
    ready_to_go: boolean; // Keep original prop, though not used for status display
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
    <Card className=""> {/* Restored Card, kept overflow-hidden removed */}
      <div> {/* Restored container div, kept relative/z-index removed */}
        {story.final_video_with_music ? (
          <video
            src={story.final_video_with_music}
            controls
            // playsInline // Keep removed
            // muted // Keep removed
            // preload // Keep removed
            // type // Keep removed
            className="w-full aspect-[9/16]" // Keep aspect ratio fix
          />
        ) : (
          <div className="w-full aspect-[9/16] bg-gray-100 flex items-center justify-center"> {/* Added aspect ratio to placeholder */}
            <Video className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2"> {/* Restored metadata section */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-slate-800 text-white">
            #{story["stories id"]}
          </Badge>
          {/* Keep updated status logic */}
          <Badge variant={!!story.final_video_with_music ? "default" : "secondary"} className="ml-2">
            {!!story.final_video_with_music ? "Ready" : "Processing"}
          </Badge>
        </div>
        {story.story_metadata?.seo_title && (
          <p className="text-sm font-medium line-clamp-2">
            {story.story_metadata.seo_title}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Created: {formatDate(story.created_at)}
        </p>
      </div>
    </Card>
  );
};
