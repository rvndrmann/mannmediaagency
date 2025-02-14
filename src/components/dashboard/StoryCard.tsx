
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, ArrowRight, Copy, Check, PlayCircle, AlertCircle } from "lucide-react";
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
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleVideoError = () => {
    setVideoError(true);
    setIsLoading(false);
    toast({
      title: "Video Error",
      description: "Unable to load video. Please try again later.",
      variant: "destructive",
    });
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
    <Card className="overflow-hidden w-full max-w-[300px]">
      <div className="p-2 border-b border-gray-200">
        <Badge variant="secondary" className="text-xs">
          Story #{story["stories id"]}
        </Badge>
      </div>
      <div className="aspect-video bg-gray-100 relative">
        {story.final_video_with_music ? (
          <div className="flex flex-col items-center gap-1 p-2">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            )}
            {videoError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <span className="text-sm text-gray-600">Video unavailable</span>
              </div>
            ) : (
              <video 
                src={story.final_video_with_music} 
                controls 
                className={`w-full h-full object-cover rounded transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  onVideoLoad(story, video.duration);
                  setIsLoading(false);
                }}
                onError={handleVideoError}
                onLoadStart={() => setIsLoading(true)}
                playsInline
                crossOrigin="anonymous"
              />
            )}
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
            <div className="flex flex-col items-center text-gray-400">
              <PlayCircle className="w-8 h-8 mb-2 animate-pulse" />
              <div className="text-sm">Processing...</div>
            </div>
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {story.story_metadata?.seo_title && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 text-gray-600">Title:</p>
              <p className="text-sm line-clamp-2">
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
              <p className="text-sm font-medium mb-1 text-gray-600">Hashtags:</p>
              <div className="max-h-20 overflow-y-auto pr-2 text-sm">
                {story.story_metadata.instagram_hashtags}
              </div>
            </div>
            <CopyButton 
              text={story.story_metadata.instagram_hashtags} 
              field="Hashtags" 
            />
          </div>
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
