
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, ArrowRight, Copy, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface StoryCardProps {
  story: {
    "stories id": number;
    created_at: string;
    ready_to_go: boolean;
    final_video_with_music: string | null;
    video_length_seconds: number | null;
    story_metadata?: {
      seo_title: string | null;
      instagram_hashtags: string | null;
    } | null;
  };
  onVideoLoad: (story: any, duration: number) => void;
}

export const StoryCard = ({ story, onVideoLoad }: StoryCardProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Card className="overflow-hidden w-full max-w-[300px] bg-white/50 backdrop-blur-sm border-cream-100">
      <div className="p-2 border-b border-cream-100">
        <Badge variant="secondary" className="text-xs bg-cream-50 text-gray-800">
          Story #{story["stories id"]}
        </Badge>
      </div>
      <div className="aspect-video bg-cream-50">
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
                  <div className="ml-2 flex items-center text-blue-600">
                    <span className="text-xs">Click three dots to download</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-600 text-sm">Processing...</div>
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {story.story_metadata?.seo_title && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 text-gray-700">Title:</p>
              <p className="text-sm line-clamp-2 text-gray-800">
                {story.story_metadata.seo_title}
              </p>
            </div>
            <CopyButton 
              text={story.story_metadata.seo_title} 
              field="Title" 
            />
          </div>
        )}
        
        {story.story_metadata?.instagram_hashtags && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 text-gray-700">Hashtags:</p>
              <div className="max-h-20 overflow-y-auto pr-2 text-sm text-gray-800">
                {story.story_metadata.instagram_hashtags}
              </div>
            </div>
            <CopyButton 
              text={story.story_metadata.instagram_hashtags} 
              field="Hashtags" 
            />
          </div>
        )}
        
        <p className="text-xs text-gray-600">
          Created: {formatDate(story.created_at)}
        </p>
        <p className="text-xs text-gray-600">
          Status: {story.ready_to_go ? "Ready" : "Processing"}
        </p>
      </div>
    </Card>
  );
};
